// // /routes/sendOtp.route.cjs
// const express = require("express");
// const crypto = require("crypto");
// const rateLimit = require("express-rate-limit");
//const { createRedisClient } = require("./lib/redisClient.cjs");
// const {sendOTPEmail} = require("../lib/mail.cjs");

// const router = express.Router();

// // --- OTP utility ---
// function generateOtp() {
//   return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
// }

// // --- Email validation ---
// const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// // --- Verify Google reCAPTCHA token ---
// async function verifyRecaptchaToken(token) {
//   const secret = process.env.RECAPTCHA_SECRET_KEY;
//   if (!secret) throw new Error("Server misconfiguration: RECAPTCHA_SECRET_KEY not set");
//   if (!token) return false;

//   try {
//     const params = new URLSearchParams();
//     params.append("secret", secret);
//     params.append("response", token);

//     const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: params.toString(),
//     });

//     if (!resp.ok) {
//       console.warn(`[send-otp] ⚠️ reCAPTCHA API returned ${resp.status}`);
//       return false;
//     }

//     const data = await resp.json();
//     return Boolean(data?.success && (data.score === undefined || data.score >= 0.5));
//   } catch (err) {
//     console.error("[send-otp] reCAPTCHA verification failed:", err.message);
//     return false;
//   }
// }

// // --- Per-IP rate limiter (express-rate-limit safety layer) ---
// const otpLimiter = rateLimit({
//   windowMs: 10 * 60 * 1000, // 10 minutes
//   max: 10, // 10 requests per 10 minutes per IP
//   message: { error: "Too many OTP requests. Please wait a few minutes." },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// // --- Main Route: POST /api/otp/send ---
// router.post("/send", otpLimiter, async (req, res) => {
//   const start = Date.now();
//   try {
//     const { email, recaptchaToken } = req.body || {};

//     // --- Validate input ---
//     if (!email) {
//       return res.status(400).json({ ok: false, error: "Email is required." });
//     }

//     const lowerEmail = String(email).trim().toLowerCase();
//     if (!emailRegex.test(lowerEmail)) {
//       return res.status(400).json({ ok: false, error: "Invalid email format." });
//     }

//     if (!recaptchaToken) {
//       return res.status(400).json({ ok: false, error: "Missing reCAPTCHA token." });
//     }

//     // --- Verify reCAPTCHA ---
//     const captchaOk = await verifyRecaptchaToken(recaptchaToken);
//     if (!captchaOk) {
//       return res.status(400).json({ ok: false, error: "Failed reCAPTCHA verification." });
//     }

//     // --- Connect to Redis ---
//     let redis;
//     try {
//       redis = await getRedis();
//     } catch (err) {
//       console.error("[send-otp] ❌ Redis connection error:", err.message);
//       return res.status(503).json({ ok: false, error: "Temporary server issue. Please retry." });
//     }

//     // --- Per-email rate limiting (5 OTPs/hour) ---
//     const rateKey = `otp_rate:${lowerEmail}`;
//     const count = await redis.incr(rateKey);
//     if (count === 1) await redis.expire(rateKey, 3600);
//     if (count > 5) {
//       return res
//         .status(429)
//         .json({ ok: false, error: "Too many OTP requests for this email. Try again in 1 hour." });
//     }

//     // --- Prevent multiple active OTPs per email ---
//     const otpKey = `otp:${lowerEmail}`;
//     const existing = await redis.get(otpKey);
//     if (existing) {
//       return res.status(429).json({
//         ok: false,
//         error: "An OTP is already active. Please check your email or wait a few minutes.",
//       });
//     }

//     // --- Generate & store OTP securely ---
//     const otp = generateOtp();
//     const ttlSeconds = 300; // 5 minutes
//     await redis.set(otpKey, otp, { EX: ttlSeconds });

//     // --- Send OTP email ---
//     try {
//       await sendOTPEmail({ to: lowerEmail, code: otp });
//     } catch (mailErr) {
//       console.error("[send-otp] ❌ Failed to send email:", mailErr.message);
//       await redis.del(otpKey); // rollback OTP to prevent ghost code
//       return res.status(500).json({ ok: false, error: "Failed to send email. Please retry." });
//     }

//     // --- Success response ---
//     const response = {
//       ok: true,
//       message: "OTP sent successfully.",
//       expiresInSeconds: ttlSeconds,
//       latencyMs: Date.now() - start,
//     };

//     if (process.env.NODE_ENV !== "production") {
//       response.devCode = otp; // show OTP in dev for local testing
//       console.log(`[send-otp] OTP for ${lowerEmail}: ${otp} (expires ${ttlSeconds}s)`);
//     }

//     return res.status(200).json(response);
//   } catch (err) {
//     console.error("[send-otp] ❌ Unhandled error:", err);
//     return res.status(500).json({
//       ok: false,
//       error: "Internal server error.",
//       message: process.env.NODE_ENV === "development" ? err.message : undefined,
//     });
//   }
// });

// module.exports = router;
