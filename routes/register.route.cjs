const express = require("express");
const { hash } = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const prisma = require("../lib/prisma.cjs");

const router = express.Router();

// --- Helper: Server-side reCAPTCHA verification ---
async function verifyRecaptchaToken(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) throw new Error("Server misconfiguration: RECAPTCHA_SECRET_KEY not set");
  if (!token) return false;

  try {
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);

    const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!resp.ok) {
      console.warn("[Register] ⚠️ reCAPTCHA API returned", resp.status);
      return false;
    }

    const data = await resp.json();
    return Boolean(data?.success && (data.score === undefined || data.score >= 0.5));
  } catch (err) {
    console.error("[Register] reCAPTCHA verification failed:", err);
    return false;
  }
}

// --- Helper: Strong password policy ---
function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  return hasLetter && hasNumber && hasSymbol;
}

// --- Rate limiter: Protect registration route (5 requests / 10 minutes per IP) ---
const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- POST /api/auth/register ---
router.post("/auth/register", registerLimiter, async (req, res) => {
  const start = Date.now();

  try {
    const { emailText, password, name, recaptchaToken } = req.body || {};

    // --- 1️⃣ Validate reCAPTCHA ---
    if (!recaptchaToken) {
      return res.status(400).json({ ok: false, error: "Missing reCAPTCHA token." });
    }
    const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
    if (!recaptchaOk) {
      return res.status(400).json({ ok: false, error: "Failed reCAPTCHA verification." });
    }

    // --- 2️⃣ Validate email ---
    const email = String(emailText || "").trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ ok: false, error: "Invalid email format." });
    }

    // --- 3️⃣ Validate password strength ---
    if (!validatePassword(password)) {
      return res.status(400).json({
        ok: false,
        error:
          "Password must be at least 8 characters long and include a letter, number, and symbol.",
      });
    }

    // --- 4️⃣ Check for existing user ---
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      return res.status(409).json({ ok: false, error: "Email is already registered." });
    }

    // --- 5️⃣ Hash password ---
    const hashedPassword = await hash(password, 12);

    // --- 6️⃣ Create user safely ---
    const user = await prisma.user.create({
      data: {
        email,
        name: name ? String(name).trim() : null,
        hashedPassword,
        otpVerified: false,
        isAdmin: false,
      },
      select: { id: true, email: true, createdAt: true },
    });

    console.info(`[Register] ✅ New user created (${email}) in ${Date.now() - start}ms`);

    // --- 7️⃣ Return success ---
    return res.status(201).json({
      ok: true,
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
