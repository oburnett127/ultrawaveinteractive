const express = require("express");
const sanitizeHtml = require("sanitize-html");
const validator = require("validator");
const rateLimit = require("express-rate-limit");
const verifyRecaptchaToken = require("../lib/verifyRecaptchaToken.cjs");
const sendContactEmail = require("../lib/sendContactEmail.cjs");

const router = express.Router();

// --- Rate limit to prevent spam and abuse (10 messages per hour per IP) ---
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Too many contact attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Middleware to safely parse JSON (limit payload size) ---
router.use(express.json({ limit: "100kb" })); // 100KB is more than enough for contact forms

// --- POST /api/contact ---
router.post("/contact", contactLimiter, async (req, res) => {
  const startTime = Date.now();
  try {
    const { name, email, phone, message, recaptchaToken } = req.body || {};

    // --- 1️⃣ Basic validation ---
    if (!email || !message) {
      return res.status(400).json({ error: "Email and message are required." });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    const fromEmail = validator.normalizeEmail(email);
    const fromName = name ? validator.escape(name.trim()) : "Anonymous";
    const fromPhone =
      phone && validator.isMobilePhone(phone, "any")
        ? validator.escape(phone.trim())
        : "Not provided";

    // --- 2️⃣ Sanitize message content ---
    const safeMessage = sanitizeHtml(message, {
      allowedTags: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li"],
      allowedAttributes: {},
      disallowedTagsMode: "escape",
    }).trim();

    if (safeMessage.length < 5) {
      return res.status(400).json({ error: "Message is too short." });
    }
    if (safeMessage.length > 5000) {
      return res.status(400).json({ error: "Message exceeds maximum length (5000 chars)." });
    }

    // --- 3️⃣ Verify reCAPTCHA ---
    if (!recaptchaToken) {
      return res.status(400).json({ error: "Missing reCAPTCHA token." });
    }

    let recaptchaResult;
    try {
      recaptchaResult = await verifyRecaptchaToken(recaptchaToken);
    } catch (recaptchaErr) {
      console.error("[ContactRoute] ❌ reCAPTCHA API error:", recaptchaErr);
      return res.status(503).json({
        error: "Verification service unavailable. Please try again later.",
      });
    }

    if (!recaptchaResult?.success) {
      console.warn("[ContactRoute] ⚠️ reCAPTCHA verification failed:", recaptchaResult);
      return res.status(400).json({ error: "Failed reCAPTCHA verification." });
    }

    // Optional: reCAPTCHA score threshold
    if (typeof recaptchaResult.score === "number" && recaptchaResult.score < 0.5) {
      console.warn(`[ContactRoute] Low reCAPTCHA score (${recaptchaResult.score}). Possible bot.`);
      return res.status(400).json({ error: "Suspicious activity detected. Please try again later." });
    }

    // --- 4️⃣ Attempt to send email ---
    try {
      await sendContactEmail({
        fromEmail,
        name: fromName,
        phone: fromPhone,
        message: safeMessage,
      });
    } catch (emailErr) {
      console.error("[ContactRoute] ❌ Email send failure:", emailErr);
      // Still respond with 200 to avoid spam retries from bots
      return res.status(200).json({
        ok: false,
        warning: "Message could not be delivered, but was received.",
      });
    }

    const duration = Date.now() - startTime;
    console.info(
      `[ContactRoute] ✅ Message from '${fromEmail}' processed in ${duration}ms.`
    );

    return res.status(200).json({
      ok: true,
      message: "Your message was sent successfully!",
    });
  } catch (err) {
    console.error("[ContactRoute] ❌ Unexpected error:", err);

    return res.status(500).json({
      error: "Internal server error.",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

module.exports = router;
