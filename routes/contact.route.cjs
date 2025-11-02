// /routes/contact.route.cjs
const sanitizeHtml = require("sanitize-html");
const validator = require("validator");
const verifyRecaptchaToken = require("../lib/verifyRecaptchaToken.cjs");
const sendContactEmail = require("../lib/sendContactEmail.cjs");

// Contact API handler (for /api/contact)
module.exports = async function contactHandler(req, res) {
  try {
    const { email, name, phone, message, recaptchaToken } = req.body || {};

    // ✅ Basic validation
    if (!email || !message) {
      return res.status(400).json({ error: "Email and message are required." });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    const fromEmail = validator.normalizeEmail(email);
    const fromName = name ? validator.escape(name.trim()) : "Anonymous";
    const fromPhone =
      phone && validator.isMobilePhone(phone, "any") ? phone.trim() : "Not provided";

    // ✅ Sanitize message content
    const safeMessage = sanitizeHtml(message, {
      allowedTags: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li"],
      allowedAttributes: {},
    });

    if (safeMessage.length < 5) {
      return res.status(400).json({ error: "Message is too short." });
    }

    // ✅ Verify reCAPTCHA
    if (!recaptchaToken) {
      return res.status(400).json({ error: "Missing reCAPTCHA token" });
    }
    const recaptchaResult = await verifyRecaptchaToken(recaptchaToken);
    if (!recaptchaResult.success || (recaptchaResult.score && recaptchaResult.score < 0.5)) {
      return res.status(400).json({ error: "Failed reCAPTCHA verification" });
    }

    // ✅ Send email
    await sendContactEmail({
      fromEmail,
      name: fromName,
      phone: fromPhone,
      message: safeMessage,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error in /api/contact handler:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
