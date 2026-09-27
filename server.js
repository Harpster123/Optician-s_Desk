const express  = require("express");
const mysql    = require("mysql2");
const path     = require("path");
const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcryptjs");
const cookie   = require("cookie-parser");
const multer   = require("multer");
const crypto   = require("crypto");

require("dotenv").config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookie());

// Multer — store CSV in memory (no disk writes needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  }
});

// ── Static files ─────────────────────────────────────────────
// Only the public/ folder is served directly. Server code, protected
// pages (views/) and config files are never reachable by URL.
const PUBLIC_DIR = path.join(__dirname, "public");
const VIEWS_DIR  = path.join(__dirname, "views");

app.use(express.static(PUBLIC_DIR, {
  index: false  // disable auto-serving index.html so our route controls it
}));

// Only allow redirects to paths on this site (blocks /login?redirect=https://evil.com)
function safeRedirect(target, fallback = "/lenses") {
  if (typeof target !== "string") return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) return fallback;
  return target;
}

// ── DB connection ─────────────────────────────────────────────
const db = mysql.createPool({
  host:               process.env.DB_HOST     || "localhost",
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "",
  database:           process.env.DB_NAME     || "optics_db",
  waitForConnections: true,
  connectionLimit:    10
});

// Test connection on startup -Redploy when DB ready
db.getConnection((err, conn) => {
  if (err) {
    console.error("Database connection failed:", err.message);
   process.exit(1);
  }
 console.log("Connected to MySQL");
 conn.release();
});

//console.error("Database connection failed — running without DB");

// ── JWT secrets ───────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("ERROR: JWT_SECRET is not set in .env — server will not start.");
  process.exit(1);
}

const USER_JWT_SECRET = process.env.USER_JWT_SECRET;
if (!USER_JWT_SECRET) {
  console.error("ERROR: USER_JWT_SECRET is not set in .env — server will not start.");
  process.exit(1);
}

// ── Token helpers ─────────────────────────────────────────────
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

function signUserToken(payload) {
  return jwt.sign(payload, USER_JWT_SECRET, { expiresIn: "7d" });
}

// Helper: fetch is_admin and sign a full user token
async function signUserTokenFromDB(userId) {
  return new Promise((resolve, reject) => {
    db.query("SELECT id, email, role, is_admin, is_paid FROM users WHERE id = ?", [userId], (err, rows) => {
    if (err || rows.length === 0) return reject(err || new Error("User not found"));
     const u = rows[0];
     resolve(signUserToken({ id: u.id, email: u.email, role: u.role, is_admin: !!u.is_admin, is_paid: !!u.is_paid }));
    });
  });
}

// ── Admin auth middleware ─────────────────────────────────────
// Accepts EITHER:
//   1. adminToken cookie (legacy .env-based super admin fallback)
//   2. userToken cookie where is_admin === true (unified user auth)
function requireAuth(req, res, next) {
  // Try userToken with is_admin first
  const userToken = req.cookies?.userToken;
  if (userToken) {
    try {
      const decoded = jwt.verify(userToken, USER_JWT_SECRET);
      if (decoded.is_admin) {
        req.admin = decoded;
        return next();
      }
    } catch {}
  }

  // Fall back to legacy adminToken (.env super admin)
  const adminToken = req.cookies?.adminToken;
  if (adminToken) {
    try {
      req.admin = jwt.verify(adminToken, JWT_SECRET);
      return next();
    } catch {
      res.clearCookie("adminToken");
    }
  }

  const wantsHTML = req.headers.accept?.includes("text/html");
  if (wantsHTML) return res.redirect("/login");
  return res.status(401).json({ error: "Not authenticated" });
}

// ── User auth middleware ──────────────────────────────────────
function requireUserAuth(req, res, next) {
  const token = req.cookies?.userToken;
  if (!token) {
    const wantsHTML = req.headers.accept?.includes("text/html");
    if (wantsHTML) {
      return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
    }
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    req.user = jwt.verify(token, USER_JWT_SECRET);
    next();
  } catch {
    res.clearCookie("userToken");
    const wantsHTML = req.headers.accept?.includes("text/html");
    if (wantsHTML) {
      return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
    }
    return res.status(401).json({ error: "Session expired — please log in again" });
  }
}

// ── CSV parser ────────────────────────────────────────────────
// Handles quoted fields, commas inside quotes, CRLF and LF line endings
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const rows  = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = [];
    let cur = "", inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        cols.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

// ═════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═════════════════════════════════════════════════════════════

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ── User auth pages ───────────────────────────────────────────

app.get("/login", (req, res) => {
  const token = req.cookies?.userToken;
  if (token) {
    try {
      jwt.verify(token, USER_JWT_SECRET);
      const redirect = safeRedirect(req.query.redirect);
      return res.redirect(redirect);
    } catch {}
    res.clearCookie("userToken");
  }
  res.sendFile(path.join(PUBLIC_DIR, "login.html"));
});

app.get("/register", (req, res) => {
  const token = req.cookies?.userToken;
  if (token) {
    try { jwt.verify(token, USER_JWT_SECRET); return res.redirect("/lenses"); } catch {}
    res.clearCookie("userToken");
  }
  res.sendFile(path.join(PUBLIC_DIR, "register.html"));
});

app.get("/forgot-password", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "forgot-password.html"));
});

app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "reset-password.html"));
});

// ── User auth API ─────────────────────────────────────────────

app.post("/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const VALID_ROLES = [
    "Dispensing Optician",
    "Optometrist",
    "Optical Assistant",
    "Student",
    "Other"
  ];

  const safeRole = VALID_ROLES.includes(role) ? role : "Other";

  db.query("SELECT id FROM users WHERE email = ?", [email.toLowerCase()], async (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (rows.length > 0) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }

    const hash = await bcrypt.hash(password, 12);

    db.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name.trim(), email.toLowerCase().trim(), hash, safeRole],
      (err, result) => {
        if (err) return res.status(500).json({ error: "Failed to create account" });

        const token = signUserToken({ id: result.insertId, email: email.toLowerCase(), role: safeRole, is_admin: false });

        res.cookie("userToken", token, {
          httpOnly: true,
          secure:   process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge:   7 * 24 * 60 * 60 * 1000  // 7 days
        });

        res.json({ ok: true });
      }
    );
  });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  db.query(
    "SELECT id, name, email, password_hash, role, is_admin FROM users WHERE email = ?",
    [email.toLowerCase().trim()],
    async (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });

      if (rows.length === 0) {
        // Timing-safe: still run bcrypt so response time doesn't leak whether email exists
        await bcrypt.compare(password, "$2b$12$invalidhashfortimingsafety000000000000000000000000000");
        return res.status(401).json({ error: "Incorrect email or password" });
      }

      const user  = rows[0];
      const match = await bcrypt.compare(password, user.password_hash);

      if (!match) {
        return res.status(401).json({ error: "Incorrect email or password" });
      }

      const token = signUserToken({ id: user.id, email: user.email, role: user.role, is_admin: !!user.is_admin });

      res.cookie("userToken", token, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge:   7 * 24 * 60 * 60 * 1000
      });

      res.json({ ok: true, name: user.name });
    }
  );
});

app.post("/auth/logout", (req, res) => {
  res.clearCookie("userToken");
  res.redirect("/login");
});

app.post("/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  // Always return generic success so we don't leak which emails are registered
  const genericResponse = { ok: true, message: "If that email is registered you'll receive a reset link shortly." };

  db.query("SELECT id, name FROM users WHERE email = ?", [email.toLowerCase().trim()], (err, rows) => {
    if (err || rows.length === 0) return res.json(genericResponse);

    const user    = rows[0];
    const token   = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    db.query(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
      [token, expires, user.id],
      (err) => {
        if (err) return res.json(genericResponse);

        const resetUrl = `https://opticiansdesk.com/reset-password?token=${token}`;

        // TODO: wire up email when ready — npm install resend, add RESEND_API_KEY to .env
        //
        // const { Resend } = require('resend');
        // const resend = new Resend(process.env.RESEND_API_KEY);
        // await resend.emails.send({
        //   from: 'noreply@opticiansdesk.com',
        //   to: email,
        //   subject: "Reset your Optician's Desk password",
        //   html: `<p>Hi ${user.name},</p>
        //          <p>Click below to reset your password. Link expires in 1 hour.</p>
        //          <p><a href="${resetUrl}">${resetUrl}</a></p>`
        // });

        console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
        res.json(genericResponse);
      }
    );
  });
});

app.post("/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Token and new password are required" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  db.query(
    "SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
    [token],
    async (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (rows.length === 0) {
        return res.status(400).json({ error: "Reset link is invalid or has expired" });
      }

      const hash = await bcrypt.hash(password, 12);

      db.query(
        "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
        [hash, rows[0].id],
        (err) => {
          if (err) return res.status(500).json({ error: "Failed to update password" });
          res.json({ ok: true });
        }
      );
    }
  );
});

// ═════════════════════════════════════════════════════════════
// PROTECTED ROUTES (user login required)
// ═════════════════════════════════════════════════════════════

app.get("/lenses", requireUserAuth, (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, "lenses.html"));
});

app.get("/api/lenses", requireUserAuth, (req, res) => {
  db.query("SELECT * FROM lenses", (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});


// ── Account page ──────────────────────────────────────────────
app.get("/account", requireUserAuth, (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, "account.html"));
});

// GET current user details
app.get("/api/account", requireUserAuth, (req, res) => {
  db.query(
    "SELECT id, name, email, role, is_admin, created_at FROM users WHERE id = ?",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (rows.length === 0) return res.status(404).json({ error: "User not found" });
      res.json(rows[0]);
    }
  );
});

// PATCH profile (name + role)
app.patch("/api/account/profile", requireUserAuth, (req, res) => {
  const { name, role } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const VALID_ROLES = ["Dispensing Optician","Optometrist","Optical Assistant","Student","Other"];
  const safeRole = VALID_ROLES.includes(role) ? role : "Other";

  db.query(
    "UPDATE users SET name = ?, role = ? WHERE id = ?",
    [name.trim(), safeRole, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: "Failed to update profile" });
      res.json({ ok: true });
    }
  );
});

// PATCH email (requires password confirmation)
app.patch("/api/account/email", requireUserAuth, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  // Verify current password first
  db.query("SELECT password_hash FROM users WHERE id = ?", [req.user.id], async (err, rows) => {
    if (err || rows.length === 0) return res.status(500).json({ error: "Database error" });

    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: "Incorrect password" });

    // Check email not already taken by another user
    db.query("SELECT id FROM users WHERE email = ? AND id != ?", [email.toLowerCase().trim(), req.user.id], (err, existing) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (existing.length > 0) return res.status(409).json({ error: "That email is already in use" });

      db.query(
        "UPDATE users SET email = ? WHERE id = ?",
        [email.toLowerCase().trim(), req.user.id],
        (err) => {
          if (err) return res.status(500).json({ error: "Failed to update email" });
          res.json({ ok: true });
        }
      );
    });
  });
});

// PATCH password
app.patch("/api/account/password", requireUserAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both passwords are required" });
  if (newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });

  db.query("SELECT password_hash FROM users WHERE id = ?", [req.user.id], async (err, rows) => {
    if (err || rows.length === 0) return res.status(500).json({ error: "Database error" });

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 12);
    db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: "Failed to update password" });
      res.json({ ok: true });
    });
  });
});

// ═════════════════════════════════════════════════════════════
// ADMIN ROUTES (admin login required)
// ═════════════════════════════════════════════════════════════

// Serve admin login page
app.get("/admin/login", (req, res) => {
  const token = req.cookies?.adminToken;
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      return res.redirect("/admin");
    } catch {
      res.clearCookie("adminToken");
    }
  }
  res.sendFile(path.join(VIEWS_DIR, "admin", "login.html"));
});

// Handle admin login
app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;

  const validUser = process.env.ADMIN_USERNAME;
  const validHash = process.env.ADMIN_PASSWORD_HASH;

  if (!validUser || !validHash) {
    return res.status(500).json({ error: "Admin credentials not configured on server" });
  }

  const usernameMatch = username === validUser;
  const passwordMatch = await bcrypt.compare(password, validHash);

  if (!usernameMatch || !passwordMatch) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = signToken({ username });

  res.cookie("adminToken", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   8 * 60 * 60 * 1000  // 8 hours
  });

  res.json({ ok: true });
});

// Admin logout
app.post("/admin/logout", (req, res) => {
  res.clearCookie("adminToken");
  res.redirect("/admin/login");
});


// ── Admin API: Users ─────────────────────────────────────────

app.get("/api/admin/users", requireAuth, (req, res) => {
  db.query(
    "SELECT id, name, email, role, is_admin, created_at FROM users ORDER BY created_at DESC",
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    }
  );
});

app.patch("/api/admin/users/:id/toggle-admin", requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);

  db.query("SELECT is_admin FROM users WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });

    const newValue = rows[0].is_admin ? 0 : 1;

    db.query("UPDATE users SET is_admin = ? WHERE id = ?", [newValue, id], (err) => {
      if (err) return res.status(500).json({ error: "Failed to update user" });
      res.json({ ok: true, is_admin: !!newValue });
    });
  });
});

// Admin panel
app.get("/admin", requireAuth, (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, "admin", "index.html"));
});

// ── Admin API: Lenses CRUD ────────────────────────────────────

app.get("/api/admin/lenses", requireAuth, (req, res) => {
  db.query("SELECT * FROM lenses ORDER BY name ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

app.post("/api/admin/lenses", requireAuth, (req, res) => {
  const { name, company, type, index, corridors, coatings, description, tags } = req.body;

  if (!name || !company || !type) {
    return res.status(400).json({ error: "name, company and type are required" });
  }

  const sql = `
    INSERT INTO lenses (name, company, type, \`index\`, corridors, coatings, description, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [name, company, type, index || null, corridors || null, coatings || null, description || null, tags || null];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to insert lens" });
    res.status(201).json({ ok: true, id: result.insertId });
  });
});

app.put("/api/admin/lenses/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, company, type, index, corridors, coatings, description, tags } = req.body;

  if (!name || !company || !type) {
    return res.status(400).json({ error: "name, company and type are required" });
  }

  const sql = `
    UPDATE lenses
    SET name=?, company=?, type=?, \`index\`=?, corridors=?, coatings=?, description=?, tags=?
    WHERE id=?
  `;
  const values = [name, company, type, index || null, corridors || null, coatings || null, description || null, tags || null, id];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to update lens" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Lens not found" });
    res.json({ ok: true });
  });
});

app.delete("/api/admin/lenses/:id", requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  console.log("Delete route hit, parsed id:", id);

  db.query("DELETE FROM lenses WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("Delete error:", err);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) return res.status(404).json({ error: "Lens not found" });
    res.json({ ok: true });
  });
});

// ── Admin API: CSV preview ────────────────────────────────────
app.post("/api/admin/lenses/csv-preview", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const text = req.file.buffer.toString("utf-8");
  const rows = parseCSV(text);

  if (rows.length < 2)
    return res.status(400).json({ error: "CSV must have a header row and at least one data row" });

  const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, "_"));

  const REQUIRED = ["name", "company", "type"];
  const missing  = REQUIRED.filter(r => !headers.includes(r));
  if (missing.length)
    return res.status(400).json({ error: `Missing required columns: ${missing.join(", ")}` });

  const lenses = rows.slice(1)
    .map((row, i) => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = row[idx] || ""; });
      return {
        _row:        i + 2,
        name:        obj.name        || "",
        company:     obj.company     || "",
        type:        obj.type        || "",
        index:       obj.index       || "",
        corridors:   obj.corridors   || "",
        coatings:    obj.coatings    || "",
        description: obj.description || "",
        tags:        obj.tags        || "",
        _valid:      !!(obj.name && obj.company && obj.type)
      };
    })
    .filter(l => l.name);

  res.json({ lenses, total: lenses.length });
});

// ── Admin API: CSV import ─────────────────────────────────────
app.post("/api/admin/lenses/csv-import", requireAuth, (req, res) => {
  const { lenses } = req.body;

  if (!Array.isArray(lenses) || lenses.length === 0)
    return res.status(400).json({ error: "No lenses provided" });

  const valid = lenses.filter(l => l.name && l.company && l.type);
  if (valid.length === 0)
    return res.status(400).json({ error: "No valid rows to import" });

  const sql    = `INSERT INTO lenses (name, company, type, \`index\`, corridors, coatings, description, tags) VALUES ?`;
  const values = valid.map(l => [
    l.name, l.company, l.type,
    l.index       || null,
    l.corridors   || null,
    l.coatings    || null,
    l.description || null,
    l.tags        || null
  ]);

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error("CSV import error:", err);
      return res.status(500).json({ error: "Import failed: " + err.message });
    }
    res.json({ ok: true, imported: result.affectedRows });
  });
});

// ═════════════════════════════════════════════════════════════
// START
// ═════════════════════════════════════════════════════════════

const agentRoutes = require("./src/agentRoutes");
agentRoutes.db = db;
app.use("/api/agent", agentRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html"));
});
