// lib/mailer.cjs
const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const host   = process.env.SMTP_HOST;
  const port   = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false") === "true";
  const user   = process.env.SMTP_USER;
  const pass   = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP env vars are missing (SMTP_HOST, SMTP_USER, SMTP_PASS)");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for 587/25 (STARTTLS)
    auth: { user, pass }
  });

  return transporter;
}

async function sendOtpEmail({ to, code }) {
  const t = getTransporter();

  const from    = process.env.FROM_EMAIL || "no-reply@example.com";
  const subject = "Your Ultrawave Interactive verification code";

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5">
      <p>Here is your verification code:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:3px">${code}</p>
      <p>This code will expire in 5 minutes. If you didn't request it, you can ignore this email.</p>
    </div>
  `;
  const text = `Your verification code is: ${code}\nIt expires in 5 minutes.`;

  await t.sendMail({ from, to, subject, text, html });
}

module.exports = { sendOtpEmail };
