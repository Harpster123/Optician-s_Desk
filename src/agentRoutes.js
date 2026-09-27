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
const router  = express.Router();

// ── Constants ─────────────────────────────────────────────────

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL             = "claude-haiku-4-5-20251001";
const MAX_TOKENS        = 512;  // Tight cap — responses should be concise
const MAX_TURNS         = 16;   // Trim history to control input tokens

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
  const tags    = parseTags(sourceLens.tags);
  const tagLike = tags.length
    ? tags.map(t => `tags LIKE '%${t}%'`).join(" OR ")
    : "1=0";

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
    sourceLens.type
  ]);

  return rows
    .map(r => ({ lens: r, score: similarityScore(sourceLens, r) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ lens }) => ({
      lens,
      reason: buildSimilarityReason(sourceLens, lens)
    }));
}

async function fetchContextLenses(db, lensFilter = {}) {
  let sql      = "SELECT name, company, type, `index`, corridors, coatings, tags FROM lenses WHERE 1=1";
  const params = [];
  if (lensFilter.type) { sql += " AND type = ?"; params.push(lensFilter.type); }
  sql += " ORDER BY name ASC LIMIT 8";
  const rows = await queryDB(db, sql, params);
return rows.map(l =>
  `${l.name} (${l.company}) | ${l.type} | idx:${l.index} | corridor:${l.corridors || "n/a"} | coatings:${l.coatings || ""} | tags:${l.tags || ""}`
);
}

// ── Build lens context block for Claude ───────────────────────

async function buildLensContext(db, message, lensFilter) {
  const mentionedName = extractMentionedLensName(message);
  console.log("DEBUG mentionedName:", mentionedName);

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
  console.log("DEBUG detectedType:", detectedType);

  const corridorMatch = message.match(/(\d+)\s*mm/i);
  const corridor = corridorMatch ? corridorMatch[1] + 'mm' : null;
  console.log("DEBUG corridor:", corridor);

  if (mentionedName) {
    const sourceLens = await findLensByName(db, mentionedName);

    if (sourceLens) {
      const similar = await findSimilarLenses(db, sourceLens, sourceLens.id);
      if (!similar.length) {
        return `\n"${mentionedName}" is in the database but no similar lenses found. Source: ${sourceLens.name} (${sourceLens.company}) | ${sourceLens.type} | idx:${sourceLens.index}`;
      }
      const lines = similar.map(({ lens, reason }) =>
        `• ${lens.name} (${lens.company}) | ${lens.type} | idx:${lens.index} | ${reason}`
      );
      return `\n"${mentionedName}" found in database. Similar lenses:\n${lines.join("\n")}`;
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
    const lines = candidates.slice(0, 3).map(l =>
      `• ${l.name} (${l.company}) | ${l.type} | idx:${l.index} | tags:${l.tags || ""}`
    );
    return `\n"${mentionedName}" not in database. Closest catalogue options by design:\n${lines.join("\n")}`;
  }

  // General lens context — no specific lens name mentioned
const clinicalOnly = ["what index", "which index", "index would", "recommend index", "index for"];
if (clinicalOnly.some(k => message.toLowerCase().includes(k))) return "";

const lensKeywords = ["lens", "recommend", "prescription", "progressive", "single vision", "bifocal", "which lens"];
if (!lensKeywords.some(k => message.toLowerCase().includes(k))) return "";

  const candidates = detectedType
    ? corridor
      ? await queryDB(db, "SELECT * FROM lenses WHERE type = ? AND corridors = ? LIMIT 5", [detectedType, corridor])
      : await queryDB(db, "SELECT * FROM lenses WHERE type = ? LIMIT 5", [detectedType])
    : await queryDB(db, "SELECT * FROM lenses LIMIT 5");

if (candidates.length) {
    const lines = candidates.map(l =>
      `${l.name} (${l.company}) | ${l.type} | idx:${l.index} | corridor:${l.corridors || "n/a"} | coatings:${l.coatings || ""} | tags:${l.tags || ""}`
    );
    console.log("DEBUG context sent to Claude:", lines);
    return `\nAVAILABLE LENSES:\n${lines.join("\n")}`;
  }

  const lenses = await fetchContextLenses(db, lensFilter || {});
  return lenses.length ? `\nAVAILABLE LENSES:\n${lenses.join("\n")}` : "";
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

router.post("/chat", requirePaidUser, async (req, res) => {
  const { messages, lensFilter } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const trimmed = messages.slice(-MAX_TURNS);
  const lastMsg = trimmed[trimmed.length - 1]?.content || "";

  const db          = router.db;
  const lensContext = db ? await buildLensContext(db, lastMsg, lensFilter) : "";
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
