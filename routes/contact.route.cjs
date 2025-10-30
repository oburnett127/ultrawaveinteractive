// /routes/contact.route.cjs
const express = require("express");
const sanitizeHtml = require("sanitize-html");
const validator = require("validator");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const { createRedisClient } = require("../lib/redisClient.cjs");
const verifyRecaptchaToken = require("../lib/verifyRecaptchaToken.cjs");
const sendContactEmail = require("../lib/sendContactEmail.cjs");

const router = express.Router();

let rateLimiterByIP, rateLimiterByEmail;

// ✅ Self-invoking async setup
(async function initRateLimiters() {
  try {
    const redisClient = await createRedisClient();

    rateLimiterByIP = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "contact_ip",
      points: 10,
      duration: 3600,       // 1 hour
      blockDuration: 1800,  // 30 minutes
    });

    rateLimiterByEmail = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "contact_email",
      points: 6,
      duration: 86400,      // 24 hours
      blockDuration: 1800,
    });

    console.log("[Contact Route] Rate limiters initialized ✅");
  } catch (err) {
    console.error("[Contact Route] Redis initialization failed ❌", err);
  }
})();

// Middleware to ensure limiters are ready
function ensureRateLimiterReady(req, res, next) {
  if (!rateLimiterByIP || !rateLimiterByEmail) {
    console.warn("[Contact Route] Rate limiter not ready yet.");
    return res.status(503).json({ error: "Service not ready. Please try again shortly." });
  }
  next();
}

router.post("/", ensureRateLimiterReady, async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const { email, name, phone, message, recaptchaToken } = req.body || {};

    // ✅ RATE LIMIT IP
    try {
      await rateLimiterByIP.consume(ip);
    } catch {
      return res.status(429).json({ error: "Too many requests from this IP. Please try again later." });
    }

    // ✅ RATE LIMIT EMAIL
    if (email) {
      try {
        await rateLimiterByEmail.consume(email.toLowerCase());
      } catch {
        return res.status(429).json({ error: "Too many messages from this email. Try again tomorrow." });
      }
    }

    // ==============================
    // ✅ VALIDATION
    // ==============================
    if (!email || !message) {
      return res.status(400).json({ error: "Email and message are required." });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    const fromEmail = validator.normalizeEmail(email);
    const fromName = name ? validator.escape(name.trim()) : "";
    const fromPhone = phone && validator.isMobilePhone(phone, "any") ? phone.trim() : "Not provided";

    // ✅ Sanitize message
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

    // ✅ Send Email
    await sendContactEmail({
      fromEmail,
      name: fromName,
      phone: fromPhone,
      message: safeMessage,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error in /contact route:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
