// lib/mail.cjs
const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  // Works with any SMTP (e.g., Namecheap Private Email, etc.)
  // Set these env vars in your app: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE ("true"/"false")
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for 587/STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function sendOTPEmail({ to, code }) {
  const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER;
  const fromName = process.env.MAIL_FROM_NAME || "Ultrawave Interactive";

  const t = getTransporter();

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.6; color:#111;">
      <h2>Your verification code</h2>
      <p>Use this code to verify your sign-in:</p>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 12px 0; padding: 12px 16px; border:1px solid #ddd; display:inline-block;">
        ${String(code).padStart(6, "0")}
      </div>
      <p style="color:#666;">This code expires in 5 minutes. If you didn’t request it, you can safely ignore this email.</p>
    </div>
  `;

  const text = `Your verification code is: ${String(code).padStart(6, "0")} (expires in 5 minutes).`;

  await t.sendMail({
    to,
    from: `${fromName} <${fromEmail}>`,
    subject: "Your verification code",
    text,
    html,
  });
}

module.exports = {sendOTPEmail, getTransporter};
