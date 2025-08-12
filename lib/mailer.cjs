// lib/mailer.cjs
const nodemailer = require("nodemailer");

// All values come from env vars. No OAuth2 used.
function getTransporter() {
  const {
    SMTP_HOST,
    SMTP_PORT,            // e.g., 465 for SSL or 587 for STARTTLS
    SMTP_SECURE,          // "true" for port 465, otherwise "false"
    SMTP_USER,            // full mailbox, e.g., noreply@yourdomain.com
    SMTP_PASS             // mailbox password or app-specific password
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP env vars missing: check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === "true", // true for 465, false for 587
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// Helper: minimal HTML escape (defense-in-depth; your route should already sanitize)
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Helper: convert (possibly plain text) message to HTML with <br> for newlines
function toHtmlParagraphs(safeStr) {
  // Convert CRLF/CR/LF to <br>
  return safeStr.replace(/\r\n|\r|\n/g, "<br>");
}

// Helper: convert (possibly HTML) to readable plain text
function toPlainText(htmlish) {
  return String(htmlish)
    // Normalize common HTML line breaks/paragraphs to newlines
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<\s*li\s*>/gi, "• ")
    .replace(/<\/\s*li\s*>/gi, "\n")
    // Strip remaining tags
    .replace(/<[^>]+>/g, "")
    // Collapse 3+ newlines to 2
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sendContactEmail({ fromEmail, name, phone, message }) {
  const transporter = getTransporter();

  const to = process.env.CONTACT_TO_EMAIL || process.env.SMTP_USER; // fallback
  if (!to) throw new Error("CONTACT_TO_EMAIL or SMTP_USER must be set.");

  // Defense-in-depth: escape even if upstream sanitized.
  const safeName = escapeHtml(name || "Website Visitor");
  const safeFrom = escapeHtml(fromEmail || "");
  const safePhone = escapeHtml(phone || "Not provided");
  const safeMessage = escapeHtml(message || "");
  const htmlMessage = toHtmlParagraphs(safeMessage);

  const htmlBody = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;">
      <p><strong>From:</strong> ${safeName} &lt;${safeFrom}&gt;</p>
      <p><strong>Phone:</strong> ${safePhone}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:12px 0;">
      <div>${htmlMessage}</div>
    </div>
  `.trim();

  const textBody = toPlainText(`
From: ${name || "Website Visitor"} <${fromEmail || ""}>
Phone: ${phone || "Not provided"}

${message || ""}
  `);

  const info = await transporter.sendMail({
    from: `"${name || "Website Visitor"}" <${process.env.SMTP_USER}>`,
    replyTo: fromEmail || undefined,
    to,
    subject: `New contact form message from ${name || fromEmail}`,
    text: textBody,
    html: htmlBody,
  });

  return info;
}

module.exports = { sendContactEmail };
