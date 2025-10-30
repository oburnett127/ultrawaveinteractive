const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const getRedis = require("../lib/redis.cjs");
const sendOtpEmail = require("../lib/mail.cjs");

// Generate a 6-digit OTP using crypto
function genOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Verify Google reCAPTCHA token
async function verifyRecaptchaToken(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    throw new Error("Server misconfiguration: RECAPTCHA_SECRET_KEY not set");
  }

  const params = new URLSearchParams();
  params.append("secret", secret);
  params.append("response", token);

  const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await resp.json();
  return Boolean(data && data.success);
}

router.post("/", async (req, res) => {
  try {
    const { email, recaptchaToken } = req.body || {};

    // ---- Validate Inputs ----
    if (!email) return res.status(400).json({ error: "Email is required" });
    const lower = String(email).trim().toLowerCase();
    if (!emailRegex.test(lower)) return res.status(400).json({ error: "Invalid email format" });

    if (!recaptchaToken) {
      return res.status(400).json({ error: "Missing reCAPTCHA token" });
    }

    // ---- Verify reCAPTCHA ----
    const captchaOk = await verifyRecaptchaToken(recaptchaToken);
    if (!captchaOk) {
      return res.status(400).json({ error: "Failed reCAPTCHA verification." });
    }

    const r = await getRedis();

    // ---- Rate Limiting (Max 5 per hour) ----
    const rateKey = `otp_rate:${lower}`;
    const currentCount = await r.incr(rateKey);
    if (currentCount === 1) {
      await r.expire(rateKey, 3600); // 1 hour window
    }
    if (currentCount > 5) {
      return res.status(429).json({ error: "Too many OTP requests. Try again later." });
    }

    // ---- Generate OTP and Store in Redis ----
    const otp = genOtp();
    const otpKey = `otp:${lower}`;
    const ttlSeconds = 300; // 5 minutes
    await r.set(otpKey, otp, { EX: ttlSeconds });

    // ---- Send OTP Email ----
    await sendOtpEmail({ to: lower, code: otp });

    // ---- Response ----
    const response = { ok: true, message: "OTP sent successfully." };
    if (process.env.NODE_ENV !== "production") {
      response.devCode = otp; // Helpful for development/testing
      console.log(`[send-otp] OTP for ${lower}: ${otp} (expires in ${ttlSeconds}s)`);
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error("[send-otp] error:", err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
});

module.exports = router;
