// ═══════════════════════════════════════════════════════════════
// email.js — sends email through Resend (https://resend.com)
//
// Settings (in .env):
//   RESEND_API_KEY  your Resend API key (starts with re_)
//   EMAIL_FROM      who emails come from, e.g.
//                   Optician's Desk <noreply@opticiansdesk.com>
//                   (must be on a domain you've verified in Resend)
//
// If RESEND_API_KEY isn't set, emails are printed to the terminal
// instead, so everything still works on your laptop.
// ═══════════════════════════════════════════════════════════════

const RESEND_URL = "https://api.resend.com/emails";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.EMAIL_FROM || "Optician's Desk <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(`\n[DEV EMAIL — not sent, RESEND_API_KEY not set]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return { ok: true, dev: true };
  }

  try {
    const res = await fetch(RESEND_URL, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ from, to, subject, html, text })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Email failed:", res.status, err.message || err);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("Email failed:", err.message);
    return { ok: false };
  }
}

// ── Email templates ───────────────────────────────────────────

function layout(bodyHtml) {
  return `
  <div style="background:#f0f3f1;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e0e6e3;">
      <div style="background:#1a2e26;padding:18px 28px;">
        <span style="font-family:Georgia,serif;font-size:18px;color:#ffffff;">Optician's Desk</span>
        <span style="font-size:11px;color:#8fa89d;letter-spacing:1px;margin-left:8px;">NZ</span>
      </div>
      <div style="padding:28px;color:#1a1f1c;font-size:15px;line-height:1.6;">
        ${bodyHtml}
      </div>
    </div>
    <p style="max-width:480px;margin:16px auto 0;text-align:center;font-size:12px;color:#8a9c95;">
      Optician's Desk — built for NZ optical dispensing
    </p>
  </div>`;
}

function passwordResetEmail({ name, resetUrl }) {
  const firstName = String(name || "").split(" ")[0] || "there";
  const safeUrl   = escapeHtml(resetUrl);

  return {
    subject: "Reset your Optician's Desk password",
    text:
`Hi ${firstName},

Someone (hopefully you) asked to reset your Optician's Desk password.
Open this link to choose a new one. It expires in 1 hour:

${resetUrl}

If you didn't ask for this, you can ignore this email — your password won't change.`,
    html: layout(`
      <p style="margin:0 0 16px;">Hi ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 20px;">Someone (hopefully you) asked to reset your Optician's Desk password. Click the button below to choose a new one. The link expires in 1 hour.</p>
      <p style="margin:0 0 24px;">
        <a href="${safeUrl}" style="display:inline-block;background:#1a2e26;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px;">Reset password</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#4a5450;">Or copy this link into your browser:</p>
      <p style="margin:0 0 20px;font-size:13px;word-break:break-all;"><a href="${safeUrl}" style="color:#2f4a3e;">${safeUrl}</a></p>
      <p style="margin:0;font-size:13px;color:#4a5450;">If you didn't ask for this, you can ignore this email — your password won't change.</p>
    `)
  };
}

module.exports = { sendEmail, passwordResetEmail };
