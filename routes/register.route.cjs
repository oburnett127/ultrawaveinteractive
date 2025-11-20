// /routes/register.route.cjs
const express = require("express");
const { hash } = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const prisma = require("../lib/prisma.cjs");
const verifyRecaptchaToken = require("../lib/verifyRecaptchaToken.cjs");

// --- Sanitizers ---
const {
  sanitizeEmail,
  sanitizeBasicText
} = require("../lib/sanitizers.cjs");

const router = express.Router();

// ---------------------------------------------
// Helper: Password strength check
// ---------------------------------------------
function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) return false;

  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  return hasLetter && hasNumber && hasSymbol;
}

// ---------------------------------------------
// Rate limiter: Protect registration route
// ---------------------------------------------
const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { error: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------------------------
// POST /api/auth/register
// ---------------------------------------------
router.post("/auth/register", registerLimiter, async (req, res) => {
  const start = Date.now();

  try {
    const { emailText, password, name, recaptchaToken } = req.body || {};

    // --------------------------------------------------
    // 1) reCAPTCHA v3 verification
    // --------------------------------------------------
    const safeRecaptchaToken =
      typeof recaptchaToken === "string" ? recaptchaToken.trim() : null;

    if (!safeRecaptchaToken) {
      return res.status(400).json({ ok: false, error: "Missing reCAPTCHA token." });
    }

    const recaptcha = await verifyRecaptchaToken(safeRecaptchaToken, "register");

    if (!recaptcha.success) {
      return res.status(400).json({
        ok: false,
        error: `Failed reCAPTCHA verification: ${recaptcha.error || "unknown"}`,
      });
    }

    // --------------------------------------------------
    // 2) Email sanitization + validation
    // --------------------------------------------------
    const safeEmail = sanitizeEmail(String(emailText || ""));
    if (!safeEmail) {
      return res.status(400).json({ ok: false, error: "Invalid email format." });
    }

    // --------------------------------------------------
    // 3) Password validation (NOT sanitized)
    // --------------------------------------------------
    if (!validatePassword(password)) {
      return res.status(400).json({
        ok: false,
        error:
          "Password must be at least 8 characters and include a letter, number, and symbol.",
      });
    }

    // --------------------------------------------------
    // 4) Check if user already exists
    // --------------------------------------------------
    const existingUser = await prisma.user.findUnique({
      where: { email: safeEmail },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({ ok: false, error: "Email is already registered." });
    }

    // --------------------------------------------------
    // 5) Hash password (password must NOT be sanitized)
    // --------------------------------------------------
    const hashedPassword = await hash(password, 12);

    // --------------------------------------------------
    // 6) Create user in database
    // --------------------------------------------------
    const safeName = name ? sanitizeBasicText(String(name)) : null;

    const user = await prisma.user.create({
      data: {
        email: safeEmail,
        name: safeName,
        hashedPassword,
        otpVerified: false,
        isAdmin: false,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    console.info(
      `[Register] ✅ User created: ${safeEmail} (${Date.now() - start}ms)`
    );

    return res.status(201).json({
      ok: true,
      success: true,
      message: "Registration successful.",
      user,
    });
  } catch (err) {
    console.error("[Register] ❌ Unexpected error:", err);

    return res.status(500).json({
      ok: false,
      error: "Internal server error.",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
