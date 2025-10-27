const express = require("express");
const router = express.Router();

app.post("/contact", async (req, res) => {
  try {
      const { email, name, phone, message, recaptchaToken } = req.body || {};

      if (!email || !message) {
        return res.status(400).json({ error: "Email and message are required." });
      }

      const fromEmail = String(email).trim();
      const fromName = name ? String(name).trim() : "";
      const fromPhone = phone ? String(phone).trim() : "";

      // Sanitize the message
      const safeMessage = sanitizeHtml(message, {
        allowedTags: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li"],
        allowedAttributes: {}, // no attributes allowed
      });

      // Verify reCAPTCHA
      if (!recaptchaToken) {
        return res.status(400).json({ error: "Missing reCAPTCHA token" });
      }
      const response = await verifyRecaptchaToken(recaptchaToken);
      if (!response.success) {
        return res.status(400).json({ error: "Failed reCAPTCHA verification" });
      }

      await sendContactEmail({
        fromEmail,
        name: fromName,
        phone: fromPhone,
        message: safeMessage,
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error sending contact email:", err);
      return res.status(500).json({ error: "Failed to send email." });
    }
  });

module.exports = router;
