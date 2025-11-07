// lib/mailerlead.cjs
const nodemailer = require("nodemailer");

async function sendNewLeadEmail(lead) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true, // true for 465, false for TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlBody = `
    <h2>New Lead from Ultrawave Salesbot</h2>
    <p><strong>Name:</strong> ${lead.name}</p>
    <p><strong>Email:</strong> ${lead.email}</p>
    <p><strong>Phone:</strong> ${lead.phone}</p>
    <p><strong>Company:</strong> ${lead.company || "N/A"}</p>
    <p><strong>Project Details:</strong> ${lead.projectDetails}</p>
    <p><strong>Estimated Budget:</strong> ${lead.estimatedBudget}</p>
    <p><strong>Timeline:</strong> ${lead.timeline || "N/A"}</p>
  `;

  await transporter.sendMail({
    from: `"Ultrawave Salesbot" <${process.env.SMTP_FROM}>`,
    to: process.env.SALES_TEAM_EMAIL,
    subject: `New Lead: ${lead.name}`,
    html: htmlBody,
  });
}

module.exports = { sendNewLeadEmail };