const nodemailer = require("nodemailer");

async function sendContactEmail({ fromEmail, name, phone, message }) {
  // Configure your email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // e.g. "mail.privateemail.com"
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: true, // SSL
    auth: {
      user: process.env.SMTP_USER, // e.g. contact@yourdomain.com
      pass: process.env.SMTP_PASS,
    },
  });

  // Construct email content
  const html = `
    <h2>New Contact Request</h2>
    <p><strong>Name:</strong> ${name || "Not provided"}</p>
    <p><strong>Email:</strong> ${fromEmail}</p>
    <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
    <h3>Message:</h3>
    <p>${message}</p>
  `;

  const text = `
New Contact Request

Name: ${name || "Not provided"}
Email: ${fromEmail}
Phone: ${phone || "Not provided"}

Message:
${message}
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Website Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.SALES_TEAM_EMAIL, // where you want to receive messages
      replyTo: fromEmail,
      subject: `New Contact Message from ${name || "Website Visitor"}`,
      text,
      html,
    });

    console.log("Contact email sent:", info.messageId);
    return true;
  } catch (err) {
    console.error("Error in sendContactEmail:", err);
    throw err;
  }
}

module.exports = sendContactEmail;
