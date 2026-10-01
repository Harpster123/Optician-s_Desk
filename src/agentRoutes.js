// ═══════════════════════════════════════════════════════════════
// agentRoutes.js  —  Dispensing AI Agent (Claude Haiku)
// Place this file in: src/agentRoutes.js
//
// In server.js add these three lines before app.listen():
//   const agentRoutes = require("./src/agentRoutes");
//   agentRoutes.db = db;
//   app.use("/api/agent", agentRoutes);
// ═══════════════════════════════════════════════════════════════

const express = require("express");
const jwt     = require("jsonwebtoken");
const { rateLimit } = require("express-rate-limit");
const router  = express.Router();

// ── Constants ─────────────────────────────────────────────────

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL             = "claude-haiku-4-5-20251001";
const MAX_TOKENS        = 512;  // Tight cap — responses should be concise
const MAX_TURNS         = 16;   // Trim history to control input tokens
const MAX_MSG_CHARS     = 2000; // Longest single message a user can send
const MAX_TOTAL_CHARS   = 12000;// Cap on the whole conversation sent per request

// ── Usage limits (per member, protects your API bill) ─────────
// Short burst limit: 20 questions per 10 minutes
const burstLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.id}`,
  message: { error: "You're asking questions very quickly — please wait a few minutes." }
});
// Daily cap: 150 questions per 24 hours. (Counts reset if the server restarts.)
const dailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, limit: 150, standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.id}`,
  message: { error: "You've reached today's limit for the assistant. It resets in 24 hours." }
});

// ── Standardised Tag Taxonomy ─────────────────────────────────
// Single source of truth for all lens tags in the DB.

const TAG_TAXONOMY = {
  tier:      ["budget", "mid", "premium"],
  use:       ["everyday", "digital", "office", "near-work", "outdoor", "driving"],
  patient:   ["kids", "adult", "senior"],
  design:    ["wide-corridor", "advanced-design", "traditional", "segment"],
  condition: ["myopia-control", "comfort", "low-vision"],
  custom:    ["bespoke", "position-of-wear"]
};

const ALL_TAGS = Object.values(TAG_TAXONOMY).flat();

// ── Health condition dispensing flags ─────────────────────────

const HEALTH_FLAGS = {
  cataract: {
    label: "Cataracts",
    guidance: "Tinted lenses to reduce glare. UV-blocking coating essential (UV accelerates progression). Polarised for outdoor use. Photochromatic for mixed environments. Avoid coatings that reduce light transmission."
  },
  keratoconus: {
    label: "Keratoconus",
    guidance: "AR coating reduces halo/starbursting. Note: spectacles have limited correction benefit in moderate-advanced keratoconus — contact lens referral may be appropriate. Avoid rimless frames with irregular Rx."
  },
  diabetes: {
    label: "Diabetes",
    guidance: "UV protection strongly recommended — increased cataract and AMD risk. Annual eye exams advised. If Rx fluctuating, wait for stable blood glucose before finalising."
  },
  glaucoma: {
    label: "Glaucoma",
    guidance: "Visual field defects may affect progressive suitability — wider corridor may assist. Tints generally not recommended (affects contrast sensitivity monitoring). Accurate prism dispensing critical."
  },
  "dry eye": {
    label: "Dry Eye",
    guidance: "AR coating reduces glare discomfort. Blue-light filter for screen use. Close-fitting frames reduce evaporative tear loss. Prefer spectacles over extended wear contact lenses."
  },
  "macular degeneration": {
    label: "AMD",
    guidance: "Yellow/amber tint improves contrast sensitivity. UV essential. High-powered reading segments or occupational lenses assist near tasks. Refer for low vision assessment if acuity significantly reduced."
  },
  migraine: {
    label: "Migraine / Photophobia",
    guidance: "FL-41 rose/amber tint has clinical evidence for migraine reduction. Photochromatic strongly recommended. AR to reduce indoor glare. Blue-light filter for screen users."
  },
  hypertension: {
    label: "Hypertension",
    guidance: "Some antihypertensives (e.g. beta-blockers) can cause vision changes or dry eyes. UV protection recommended. Calcium channel blockers may affect IOP — liaise with prescriber if concerned."
  }
};

// ── Calculator descriptions ───────────────────────────────────

const CALCULATORS = {
  "optical cross":       "Maps lens power at all meridians for both eyes. Use to visualise sphere, cylinder and axis — helpful for explaining Rx to patients or checking combined powers.",
  "mbs / lens size":     "Calculates minimum blank size for a given frame and Rx. Prevents ordering blanks that can't be edged.",
  "prism decentration":  "Calculates induced prism via Prentice's Rule (P = c × F). Use when PD doesn't match frame centration, or to check dispensability for a given Rx.",
  "lens thickness":      "Estimates edge and centre thickness by power, diameter and index. Use to advise on thickness or compare across indices.",
  "cylinder conversion": "Transposes Rx between positive and negative cylinder form. Use when Rx convention differs from your lab or lensometer.",
  "vertex distance":     "Adjusts power for BVD changes — trial frame to spectacle Rx. Important for Rx above ±4.00D.",
  "oblique cylinder":    "Calculates resultant power of two cylinders at oblique axes. Use for over-refraction or lens combination calculations."
};

// ── System prompt ─────────────────────────────────────────────

// ── Clinical rules (owned by Optician's Desk) ─────────────────
// Your professional standards. The assistant follows these over its general
// knowledge. Edit, add or remove lines here — one rule per line.
const CLINICAL_RULES = [
  "For children (under 18), recommend impact-resistant lens materials — polycarbonate (1.59) or Trivex (1.53) — where the lens is available in them (see each lens's IMPACT-RESISTANT line). If a lens is NOT available in either, say so plainly and note that this matters for children. Do not recommend a material or index for a child on thickness grounds alone.",
];

function buildSystemPrompt() {
  const healthContext = Object.values(HEALTH_FLAGS)
    .map(v => `${v.label}: ${v.guidance}`)
    .join("\n");

  const calcContext = Object.entries(CALCULATORS)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  return `You are a dispensing assistant for Optician's Desk — a clinical reference tool for NZ dispensing opticians, optometrists and optical assistants.

You assist with:
- Dispensing questions (optics, fitting, Rx interpretation, NZ standards)
- Explaining site calculators
- Lens recommendations and similarity matching from the database
- Dispensing flags for patients with health conditions

CALCULATORS:
${calcContext}

HEALTH CONDITIONS:
${healthContext}

LENS RECOMMENDATIONS:
- Use only lenses provided in the message — never invent products
- CRITICAL: Never state lens specifications beyond what is explicitly provided in the data
- CRITICAL: Corridor length MUST be quoted exactly as given in the lens data — do not use general knowledge or estimates
- If corridor is listed as 18mm in the data, say 18mm — never substitute a different value
- For similarity matches a pre-computed reason is provided — use it, don't expand significantly
- Rank by clinical and lifestyle fit
- If a requested lens is not in the database, say so in one sentence then present closest matches

ANSWER STRUCTURE FOR LENS QUESTIONS:
- Lead with the LENS ITSELF, in this order: what it is (type and design), who it suits / key design feature (from the DESIGN line), available indices, corridor / minimum fitting height
- Then any dispensing considerations
- Coatings come LAST, in one short line at most (e.g. "Coating options: …") — or leave them out entirely unless the user asks about coatings
- Never open an answer with coatings, and never let coatings take up more space than the lens design
- If a field is "not listed", say it isn't listed in the database rather than guessing

CLINICAL RULES (professional standards — always follow these, they override general knowledge):
${CLINICAL_RULES.map(rule => "- " + rule).join("\n")}

HOW TO RECOMMEND:
- Lenses under "BEST-MATCHING LENSES" are already ranked by fit, with the reason they were shortlisted
- Give ONE main recommendation and 1–2 alternatives, and say in a few words why each suits this patient's needs (use their DESIGN line and tags)
- Prefer lenses whose design clearly matches the job over generic all-rounders; for screen-heavy presbyopes, an occupational/office lens is usually the main or second-pair answer
- Spread alternatives across suppliers where sensible, so the dispenser has options with their usual lab
- If the shortlist contains nothing suitable, say so rather than forcing a pick
- When a supplier has a suitable lens on the shortlist, include it — don't leave a supplier out for no reason (e.g. for myopia control, consider each supplier's lens)
- Office / occupational lenses with distance profiles (e.g. 100/200/400cm, Book/Near/Room, Close/Screen/Space ~1m/2m/6m): the distance is how far clear vision extends. Choose the SHORTEST profile that covers the patient's tasks — about 1m for screen + desk work, about 2m to include colleagues or a meeting table, 4m+ for moving around a room. Shorter profiles give the widest near and intermediate fields

ACCURACY RULES (these override style):
- Only describe a lens using the fields given for it. Do not add features, corridor lengths, "standard" values, prices or cost comparisons from general knowledge
- No health or wellbeing claims for coatings or filters (e.g. sleep, eye health from blue-light filters) unless they appear in the lens data
- For heavy screen / computer / office use by presbyopes, consider occupational or office lenses from the data alongside (or instead of) a general progressive, and say why (wider intermediate zone)
- Typical working distances: desktop screen ~50–70cm (intermediate), laptop/tablet ~40–50cm, reading ~33–40cm
- If unsure about a clinical point, leave it out rather than guess
- Use each lens name exactly as written on its LENS line — never add or drop words (e.g. don't add "Plus")
- Shorter corridors / lower minimum fitting heights suit SHALLOW frames; longer corridors suit DEEPER frames. Never say a short corridor is for deep frames
- Keep corridor length and minimum fitting height distinct — e.g. "14mm (min fitting height 17mm)" means a 14mm corridor needing at least 17mm fitting height
- Polycarbonate is 1.59 and Trivex is 1.53 — never call any other index polycarbonate or Trivex. Use the IMPACT-RESISTANT line to see which lenses come in them
- Quote the CORRIDOR / FITTING HEIGHT line word for word — never merge or summarise options (e.g. "fixed 14, 16 or 18mm, or variable from 13mm" must not become "13–18mm")
- No comparisons between suppliers or lenses that aren't in the data (e.g. "easier to adapt to than competitors", "better than X")
- No price or cost language at all — don't use the words cost, price, cheap, expensive, affordable or value for money. Tier tags (budget / mid / premium) can be described only as "budget-tier", "mid-tier" or "premium-tier"
- No effectiveness claims — don't say "evidence-based", "clinically proven", "clinically supported" or quote efficacy figures unless the DESIGN line states them
- Don't call indices "stock" or "surfaced" — the data doesn't say which
- List indices exactly as given in INDICES — never shorten or drop values; a range like "1.50–1.74" is only OK if every value in between is listed
- Describe the lens type exactly as the DESIGN line does (e.g. a "degressive" lens is not a "short-corridor progressive")
- When the user gives a prescription, include brief index guidance using only indices the recommended lenses are listed in (e.g. for −6.00, suggest 1.67 or 1.74 where available, for thinner, lighter lenses)

STYLE:
- Users are trained clinicians — be concise and technical
- Use correct terminology (BVD, Abbe, MBS, sag, prism, POW etc.)
- Short bullet points where appropriate
- No marketing language`;
}

// ── Auth middleware ────────────────────────────────────────────

// Checks membership in the database on every request (not the login token),
// so switching a member on or off in admin takes effect immediately.
async function requirePaidUser(req, res, next) {
  const token = req.cookies?.userToken;
  if (!token) return res.status(401).json({ error: "Login required" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.USER_JWT_SECRET);
  } catch {
    res.clearCookie("userToken");
    return res.status(401).json({ error: "Session expired" });
  }

  let rows;
  try {
    rows = await new Promise((resolve, reject) =>
      router.db.query("SELECT is_paid, is_admin FROM users WHERE id = ?", [decoded.id],
        (err, r) => err ? reject(err) : resolve(r)));
  } catch (err) {
    console.error("Membership check failed:", err.message);
    return res.status(500).json({ error: "Could not check membership — please try again" });
  }

  if (rows.length === 0) {
    res.clearCookie("userToken");
    return res.status(401).json({ error: "Session expired" });
  }

  // is_admin bypasses paid gate
  if (!rows[0].is_paid && !rows[0].is_admin) {
    return res.status(403).json({ error: "paid_required" });
  }

  req.user = { ...decoded, is_paid: !!rows[0].is_paid, is_admin: !!rows[0].is_admin };
  next();
}

// ── Tag utilities ─────────────────────────────────────────────

function parseTags(tagStr) {
  if (!tagStr) return [];
  return tagStr.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
}

function sharedTags(tagsA, tagsB) {
  return tagsA.filter(t => tagsB.includes(t));
}

// Pre-compute a compact similarity reason — Claude just presents this, doesn't derive it
function buildSimilarityReason(source, match) {
  const reasons = [];
  if (source.type === match.type)             reasons.push(`same design (${match.type})`);
  if (source.index === match.index)           reasons.push(`same index (${match.index})`);
  if (source.corridors && match.corridors &&
      source.corridors === match.corridors)   reasons.push(`same corridor (${match.corridors})`);
  const shared = sharedTags(parseTags(source.tags), parseTags(match.tags));
  if (shared.length)                          reasons.push(`shared: ${shared.join(", ")}`);
  return reasons.length ? reasons.join(" · ") : "similar category";
}

function similarityScore(source, candidate) {
  let score = 0;
  if (source.type      === candidate.type)      score += 4;
  if (source.index     === candidate.index)     score += 3;
  if (source.corridors && candidate.corridors &&
      source.corridors === candidate.corridors) score += 2;
  score += sharedTags(parseTags(source.tags), parseTags(candidate.tags)).length;
  return score;
}

// ── Lens name extractor ───────────────────────────────────────
// Catches: "something like a Varilux Comfort", "similar to Hoyalux", "like the OptiCo Basic"

function extractMentionedLensName(message) {
  const genericTerms = ["progressive", "progressives", "bifocal", "bifocals",
    "single vision", "anti-fatigue", "occupational", "myopia", "lens", "lenses"];

  const patterns = [
    /(?:like|similar to|same as|equivalent to|instead of|replace(?:ment for)?)\s+(?:a\s+|an\s+|the\s+)?([A-Z][A-Za-z0-9\s\-]{2,40})/i,
    /(?:I want|looking for|do you have)\s+(?:a\s+|an\s+|the\s+)?([A-Z][A-Za-z0-9\s\-]{2,40})/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const name = match[1].trim();
      // Reject if it's just a generic lens type term
      if (genericTerms.some(t => name.toLowerCase() === t.toLowerCase())) return null;
      return name;
    }
  }
  return null;
}

// ── Lens formatting for the AI ───────────────────────────────
// Fixed order: identity → design → indices → corridor → tags → coatings LAST.
const TYPE_LABEL = {
  progressives: "Progressive", single: "Single vision", "anti-fatigue": "Anti-fatigue / digital single vision",
  occupational: "Occupational / office", myopia: "Myopia control", bifocals: "Bifocal"
};

// Common lens materials by index, so the AI never confuses e.g. 1.59 (polycarbonate) with 1.60
const MATERIAL_BY_INDEX = {
  "1.50": "standard plastic / CR-39", "1.53": "Trivex — impact-resistant", "1.55": "mid-index plastic",
  "1.56": "mid-index plastic", "1.59": "polycarbonate — impact-resistant", "1.60": "high-index plastic (not impact-rated)",
  "1.67": "high-index plastic", "1.70": "high-index plastic", "1.74": "ultra-high-index plastic"
};

function describeIndices(indexText) {
  const list = String(indexText || "").split(",").map(x => x.trim()).filter(Boolean);
  if (!list.length) return { text: "not listed", impact: "not known — no indices listed" };
  const text = list.map(i => MATERIAL_BY_INDEX[i] ? `${i} (${MATERIAL_BY_INDEX[i]})` : i).join(", ");
  const impactOptions = list.filter(i => i === "1.53" || i === "1.59");
  const impact = impactOptions.length
    ? `YES — ${impactOptions.map(i => i === "1.59" ? "1.59 polycarbonate" : "1.53 Trivex").join(" and ")}`
    : "NO — not listed in polycarbonate or Trivex";
  return { text, impact };
}

function describeLens(l, extra = "") {
  const v = x => (x && String(x).trim()) || "not listed";
  const idx = describeIndices(l.index);
  return [
    `LENS: ${l.name} (${l.company})`,
    `  TYPE: ${TYPE_LABEL[l.type] || l.type}`,
    `  DESIGN: ${v(l.description)}`,
    `  INDICES (material): ${idx.text}`,
    `  IMPACT-RESISTANT MATERIAL AVAILABLE: ${idx.impact}`,
    `  CORRIDOR / FITTING HEIGHT: ${v(l.corridors)}`,
    `  TAGS: ${v(l.tags)}`,
    extra ? `  ${extra}` : null,
    `  COATING OPTIONS (mention last, briefly): ${v(l.coatings)}`
  ].filter(Boolean).join("\n");
}

// Find lenses whose names appear in the user's message, e.g. "tell me about Varilux Comfort Max".
// Matches the full name, or the name without a leading brand word ("SmartLife Pure" for "ZEISS Progressive SmartLife Pure").
const normalise = t => String(t || "").toLowerCase().replace(/[^a-z0-9.+ ]/g, " ").replace(/\s+/g, " ").trim();

async function findLensesInMessage(db, message) {
  const msg = ` ${normalise(message)} `;
  const all = await queryDB(db, "SELECT * FROM lenses");
  const hits = [];
  for (const l of all) {
    const full = normalise(l.name);
    const brands = ["zeiss", "hoya", "hoyalux", "essilor", "varilux"];
    const variants = new Set([full]);
    // drop leading brand / category words for shorter references
    let short = full;
    for (const w of [...brands, "progressive", "single vision", "digital"]) {
      if (short.startsWith(w + " ")) short = short.slice(w.length + 1);
    }
    if (short.length >= 5) variants.add(short);
    // longest variant that appears in the message
    const match = [...variants].filter(vn => msg.includes(` ${vn} `)).sort((a, b) => b.length - a.length)[0];
    if (match) hits.push({ lens: l, text: match });
  }
  // Prefer the most specific match: drop a hit whose matched text sits inside a longer match
  // ("smartlife" inside "smartlife pure", "nulux" inside "nulux ep")
  hits.sort((a, b) => b.text.length - a.text.length);
  const kept = [];
  for (const h of hits) {
    if (!kept.some(k => k.text !== h.text && k.text.includes(h.text))) kept.push(h);
  }
  return kept.slice(0, 3).map(h => h.lens);
}

// ── DB helpers ────────────────────────────────────────────────

function queryDB(db, sql, params = []) {
  return new Promise((resolve) => {
    db.query(sql, params, (err, rows) => {
      if (err) { console.error("DB:", err.message); return resolve([]); }
      resolve(rows || []);
    });
  });
}

async function findLensByName(db, name) {
  const rows = await queryDB(db, "SELECT * FROM lenses WHERE name LIKE ? LIMIT 1", [`%${name}%`]);
  return rows[0] || null;
}

async function findSimilarLenses(db, sourceLens, excludeId = null) {
  const tags    = parseTags(sourceLens.tags).slice(0, 10);
  // Placeholders (?) instead of pasting tag text into the SQL
  const tagLike = tags.length
    ? tags.map(() => "tags LIKE ?").join(" OR ")
    : "1=0";
  const tagParams = tags.map(t => `%${t.replace(/[%_\\]/g, "\\$&")}%`);

  const sql = `
    SELECT * FROM lenses
    WHERE id != ?
      AND (
        (type = ? AND \`index\` = ?)
        OR type = ?
        OR (${tagLike})
      )
    LIMIT 10
  `;

  const rows = await queryDB(db, sql, [
    excludeId || 0,
    sourceLens.type, sourceLens.index,
    sourceLens.type,
    ...tagParams
  ]);

  return rows
    .filter(r => String(r.id) !== String(sourceLens.id))
    .map(r => ({ lens: r, score: similarityScore(sourceLens, r) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ lens }) => ({
      lens,
      reason: buildSimilarityReason(sourceLens, lens)
    }));
}

async function fetchContextLenses(db, lensFilter = {}) {
  let sql      = "SELECT name, company, type, description, `index`, corridors, coatings, tags FROM lenses WHERE 1=1";
  const params = [];
  if (lensFilter.type) { sql += " AND type = ?"; params.push(lensFilter.type); }
  sql += " ORDER BY name ASC LIMIT 8";
  const rows = await queryDB(db, sql, params);
  return rows.map(l => describeLens(l));
}

// ── Build lens context block for Claude ───────────────────────

async function buildLensContext(db, message, lensFilter) {
  const lower = message.toLowerCase();
  const wantsAlternatives = /\b(similar|like|alternative|alternatives|equivalent|instead of|compare|comparable|replace|versus|vs)\b/.test(lower);

  // 1. Lenses named directly in the question — give their full details first
  const named = await findLensesInMessage(db, message);
  if (named.length) {
    let out = `\nLENS DATA FROM DATABASE (the lens(es) the user asked about):\n${named.map(l => describeLens(l)).join("\n\n")}`;
    if (wantsAlternatives && named.length === 1) {
      const similar = await findSimilarLenses(db, named[0], named[0].id);
      if (similar.length) {
        out += `\n\nSIMILAR LENSES IN DATABASE:\n${similar.map(({ lens, reason }) => describeLens(lens, `WHY SIMILAR: ${reason}`)).join("\n\n")}`;
      }
    }
    return out;
  }

  const mentionedName = extractMentionedLensName(message);

  const typeMap = {
    "progressive": "progressives",
    "bifocal":     "bifocals",
    "single":      "single",
    "anti-fatigue":"anti-fatigue",
    "occupational":"occupational",
    "myopia":      "myopia"
  };
  const detectedType = Object.entries(typeMap).reduce((found, [keyword, dbType]) => {
    return !found && message.toLowerCase().includes(keyword) ? dbType : found;
  }, null);

  const corridorMatch = message.match(/(\d+)\s*mm/i);
  const corridor = corridorMatch ? corridorMatch[1] + 'mm' : null;

  if (mentionedName) {
    const sourceLens = await findLensByName(db, mentionedName);

    if (sourceLens) {
      const similar = await findSimilarLenses(db, sourceLens, sourceLens.id);
      if (!similar.length) {
        return `\nLENS DATA FROM DATABASE (no similar lenses found):\n${describeLens(sourceLens)}`;
      }
      return `\nLENS DATA FROM DATABASE:\n${describeLens(sourceLens)}\n\nSIMILAR LENSES IN DATABASE:\n${similar.map(({ lens, reason }) => describeLens(lens, `WHY SIMILAR: ${reason}`)).join("\n\n")}`;
    }

    // Named lens not in DB — fall back to type+corridor match
    const candidates = detectedType
      ? corridor
        ? await queryDB(db, "SELECT * FROM lenses WHERE type = ? AND corridors = ? LIMIT 5", [detectedType, corridor])
        : await queryDB(db, "SELECT * FROM lenses WHERE type = ? LIMIT 5", [detectedType])
      : await queryDB(db, "SELECT * FROM lenses LIMIT 5");

    if (!candidates.length) {
      return `\n"${mentionedName}" not in database. No catalogue lenses found to compare.`;
    }
    return `\n"${mentionedName}" is NOT in the database. Closest catalogue options by design:\n${candidates.slice(0, 3).map(l => describeLens(l)).join("\n\n")}`;
  }

  // General lens question — score every lens against what the user needs
  const clinicalOnly = ["what index", "which index", "index would", "recommend index", "index for"];
  if (clinicalOnly.some(k => lower.includes(k))) return "";

  const need = detectNeeds(lower, detectedType);
  const lensKeywords = ["lens", "recommend", "prescription", "progressive", "single vision", "bifocal", "which lens", "suit", "best"];
  if (!need.tags.size && !need.types.size && !lensKeywords.some(k => lower.includes(k))) return "";

  const all = await queryDB(db, "SELECT * FROM lenses");
  const picks = pickLenses(all, need);
  if (!picks.length) {
    const lenses = await fetchContextLenses(db, lensFilter || {});
    return lenses.length ? `\nAVAILABLE LENSES:\n${lenses.join("\n\n")}` : "";
  }

  const summary = [
    need.types.size ? `lens types: ${[...need.types].join(", ")}` : null,
    need.tags.size  ? `needs: ${[...need.tags].join(", ")}` : null,
    need.highRx     ? `high prescription (${need.highRx}) — favour lenses offered in 1.67/1.74` : null
  ].filter(Boolean).join("; ");

  return `\nBEST-MATCHING LENSES FROM DATABASE (ranked by fit to the question${summary ? " — " + summary : ""}):\n` +
    picks.map(({ lens, reasons }) => describeLens(lens, reasons.length ? `WHY SHORTLISTED: ${reasons.join(", ")}` : "")).join("\n\n");
}

// ── Matching lenses to the job ────────────────────────────────
// Turns the question into wanted lens types + tags (the same tag vocabulary used in the database).
const NEED_RULES = [
  { re: /\b(screens?|computers?|monitors?|laptops?|office|desk|desktop|digital|pc|devices?|tablets?|phones?)\b/, tags: ["digital", "office"], screen: true },
  { re: /\b(read|reading|near|books?|close work|sewing|craft|crafts|knitting|paperwork)\b/, tags: ["near-work"] },
  { re: /\b(driv\w*|night|car|headlights?|glare|road)\b/, tags: ["driving"] },
  { re: /\b(outdoors?|sports?|golf|tennis|hik\w*|sun|cycling|fishing)\b/, tags: ["outdoor"] },
  { re: /\b(kids?|child|children|paediatric|pediatric|school|teen\w*|myopia (control|management|progression))\b/, tags: ["kids", "myopia-control"], types: ["myopia"] },
  { re: /\b(first[- ]time|new wearer|never worn|adapt\w*|swim|sway|dizzy|non[- ]tolerance|struggl\w*)\b/, tags: ["comfort", "wide-corridor"] },
  { re: /\b(budget|cheap\w*|afford\w*|entry|value|low cost)\b/, tags: ["budget"] },
  { re: /\b(premium|top|high[- ]end|personali[sz]ed|individual\w*|custom\w*|bespoke|best available)\b/, tags: ["premium", "bespoke", "advanced-design", "position-of-wear"] },
  { re: /\b(everyday|all[- ]day|general (use|wear)|daily)\b/, tags: ["everyday"] },
  { re: /\b(older|senior|elderly|retired)\b/, tags: ["senior"] },
  { re: /\b(low vision|amd|macular)\b/, tags: ["low-vision"] }
];

function detectNeeds(lower, detectedType) {
  const tags = new Set(), types = new Set();
  let screen = false;
  for (const rule of NEED_RULES) {
    if (rule.re.test(lower)) {
      rule.tags.forEach(t => tags.add(t));
      (rule.types || []).forEach(t => types.add(t));
      if (rule.screen) screen = true;
    }
  }
  if (detectedType) types.add(detectedType);

  // Age if given ("52", "aged 52", "8 year old") — ignores Rx values, mm, cm, hours etc.
  const ageMatch = lower.match(/\b(\d{1,2})\s*(?:yo|y\/o|yrs?|years?[- ]old|year[- ]old)\b/) ||
                   lower.match(/\bage[d]?\s*(\d{1,2})\b/) ||
                   lower.match(/(?:^|[\s,(])([1-9]\d)(?=\s*[,)]|\s*$|\s+(?:and|with|who|but)\b)/);
  const age = ageMatch ? parseInt(ageMatch[1], 10) : null;
  if (age !== null && age < 18) { tags.add("kids"); }

  const noAdd = /\b(no|without (?:an? )?|zero) (reading )?add\b|\bnot (yet )?presbyop|\bpre-?presbyop/.test(lower);
  const addCue = /\b(add|presbyop\w*|progressives?|varifocals?|multifocals?|bifocals?)\b/.test(lower) && !noAdd;
  const presbyope = !noAdd && (addCue || (age !== null && age >= 45)) && !(age !== null && age < 38 && !/\+\s?\d\.\d{2}\s*add/.test(lower));
  if (presbyope && !types.has("bifocals")) types.add("progressives");
  if (presbyope && (screen || tags.has("near-work"))) types.add("occupational");    // office lens as main or second pair
  if (!presbyope && screen && !types.has("myopia")) { types.add("anti-fatigue"); types.add("single"); }

  // Prescription strength, e.g. "-6.00" or "+5.50" (ignoring the add)
  const sph = [...lower.matchAll(/([+-]\s?\d{1,2}(?:\.\d{1,2})?)(?!\s*add)/g)].map(m => Math.abs(parseFloat(m[1].replace(/\s/g, ""))));
  const strongest = sph.length ? Math.max(...sph) : 0;
  const highRx = strongest >= 4 ? (lower.match(/[+-]\s?\d{1,2}(?:\.\d{1,2})?/) || [""])[0] : null;

  return { tags, types, highRx };
}

function pickLenses(all, need, max = 8, perLab = 3) {
  const scored = all
    .filter(l => !need.types.size || need.types.has(l.type))
    .map(l => {
      const lensTags = String(l.tags || "").toLowerCase().split(",").map(t => t.trim()).filter(Boolean);
      const reasons = [];
      let score = 0;
      if (need.types.has(l.type)) { score += 3; reasons.push(TYPE_LABEL[l.type] || l.type); }
      for (const t of need.tags) if (lensTags.includes(t)) { score += 2; reasons.push(t); }
      if (need.highRx && /1\.(67|74)/.test(l.index || "")) { score += 1; reasons.push("high-index available"); }
      if (l.description) score += 0.5;          // prefer lenses we can actually describe
      if (l.index) score += 0.25;
      return { lens: l, score, reasons };
    })
    .sort((a, b) => b.score - a.score || String(a.lens.name).localeCompare(b.lens.name));

  // Keep variety: at most `perLab` per lab, and make sure each wanted type is represented
  const out = [], labCount = {};
  const take = x => { const k = String(x.lens.company).toLowerCase(); if ((labCount[k] || 0) >= perLab || out.includes(x)) return false; labCount[k] = (labCount[k] || 0) + 1; out.push(x); return true; };
  // Each wanted type gets its best 2 (from different labs where possible) before the rest fill up
  for (const t of need.types) {
    const ofType = scored.filter(x => x.lens.type === t);
    const first = ofType[0];
    if (first) take(first);
    const second = ofType.find(x => x !== first && String(x.lens.company).toLowerCase() !== String(first.lens.company).toLowerCase()) || ofType[1];
    if (second) take(second);
  }
  for (const x of scored) { if (out.length >= max) break; take(x); }
  return out.sort((a, b) => b.score - a.score);
}

// ── Health flag context ───────────────────────────────────────

function buildHealthContext(message) {
  const lower = message.toLowerCase();
  const flags = Object.entries(HEALTH_FLAGS)
    .filter(([key]) => lower.includes(key))
    .map(([, val]) => `${val.label}: ${val.guidance}`);
  return flags.length ? `\nHEALTH FLAGS:\n${flags.join("\n")}` : "";
}

// ── GET /api/agent/ping ───────────────────────────────────────
router.get("/ping", requirePaidUser, (req, res) => {
  res.json({ ok: true });
});

// ── POST /api/agent/chat ──────────────────────────────────────

router.post("/chat", requirePaidUser, burstLimiter, dailyLimiter, async (req, res) => {
  const { messages, lensFilter } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }

  // Only accept plain-text user/assistant turns of sensible length
  const valid = messages.every(m =>
    m && (m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string" && m.content.length <= MAX_MSG_CHARS
  );
  if (!valid) {
    return res.status(400).json({ error: `Messages must be text under ${MAX_MSG_CHARS} characters` });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  let trimmed = messages.slice(-MAX_TURNS).map(m => ({ role: m.role, content: m.content }));
  // Drop oldest turns until the conversation fits the size cap
  while (trimmed.length > 1 && trimmed.reduce((n, m) => n + m.content.length, 0) > MAX_TOTAL_CHARS) {
    trimmed = trimmed.slice(1);
  }
  // Claude expects the conversation to start with a user turn and end with one
  while (trimmed.length && trimmed[0].role !== "user") trimmed = trimmed.slice(1);
  if (!trimmed.length || trimmed[trimmed.length - 1].role !== "user") {
    return res.status(400).json({ error: "Last message must be from the user" });
  }
  const lastMsg = trimmed[trimmed.length - 1]?.content || "";

  const db          = router.db;
  const safeFilter  = lensFilter && typeof lensFilter.type === "string" ? { type: lensFilter.type.slice(0, 40) } : {};
  const lensContext = db ? await buildLensContext(db, lastMsg, safeFilter) : "";
  const healthCtx   = buildHealthContext(lastMsg);

  // Append DB context to final user message only — keeps system prompt lean
  const messagesWithContext = [...trimmed];
  if (lensContext || healthCtx) {
    const last = { ...messagesWithContext[messagesWithContext.length - 1] };
    last.content = last.content + lensContext + healthCtx;
    messagesWithContext[messagesWithContext.length - 1] = last;
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        system:     buildSystemPrompt(),
        messages:   messagesWithContext
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Anthropic API error:", err);
      return res.status(502).json({ error: "AI service error — please try again" });
    }

    const data  = await response.json();
    const reply = data.content?.find(b => b.type === "text")?.text || "";

    res.json({
      reply,
      tokens: { input: data.usage?.input_tokens, output: data.usage?.output_tokens }
    });

  } catch (err) {
    console.error("Agent error:", err);
    res.status(500).json({ error: "Agent unavailable — please try again" });
  }
});

// ── GET /api/agent/tags ───────────────────────────────────────
// Returns tag taxonomy — useful for admin UI and CSV imports

router.get("/tags", (req, res) => {
  res.json(TAG_TAXONOMY);
});

module.exports = router;
