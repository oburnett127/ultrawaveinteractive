const nodemailer = require("nodemailer");

async function sendContactEmail({ fromEmail, name, phone, message }) {
  // Configure your email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // e.g. "mail.privateemail.com"
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: true, // SSL
    auth: {
      user: process.env.EMAIL_USERNAME, // e.g. contact@yourdomain.com
      pass: process.env.EMAIL_PASSWORD,
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
      from: `"Website Contact Form" <${process.env.EMAIL_USERNAME}>`,
      to: process.env.CONTACT_RECEIVER_EMAIL, // where you want to receive messages
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
