// /routes/otp.route.cjs
const express = require("express");
const router = express.Router();

const rateLimit = require("express-rate-limit");
const prisma = require("../lib/prisma.cjs");
const verifyRecaptchaToken = require("../lib/verifyRecaptchaToken.cjs");
const { getTransporter } = require("../lib/mail.cjs"); // Your email logic
const sanitizeEmail = require("../lib/sanitizers.cjs");
const sanitizeNumberString = require("../lib/sanitizers.cjs");

// ---------------------------------------------
// RATE LIMITERS
// ---------------------------------------------
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  handler: (req, res) => {
    return res.status(429).json({ error: "Too many OTP requests. Try again later." });
  },
});

// ---------------------------------------------
// GENERATE OTP
// ---------------------------------------------
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------------------------------------------
// SEND OTP
// ---------------------------------------------
router.post("/send", otpLimiter, async (req, res) => {
  try {
    const { email, recaptchaToken } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    let emailSanitized = sanitizeEmail(email);

    console.log("🔍 Received token from client:", req.body.recaptchaToken);
    console.log("🔍 req.body:", req.body);

    // 🔐 reCAPTCHA v3 Verification
    const recaptcha = await verifyRecaptchaToken(recaptchaToken, "otp");
    if (!recaptcha.success) {
      return res.status(400).json({ error: "Failed reCAPTCHA." });
    }

    // Look up the user
    const user = await prisma.user.findUnique({ where: { sanitizedEmail } });

    if (!user) {
      return res.status(400).json({ error: "No user found with that email." });
    }

    // Generate new OTP
    const otp = generateOtp();

    await prisma.user.update({
      where: { sanitizedEmail },
      data: {
        otpCode: otp,
        otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        otpVerified: false
      }
    });


    // Send OTP via email
    const transporter = await getTransporter();
    await transporter.sendMail({
      to: user.sanitizedEmail,
      from: process.env.EMAIL_FROM,
      subject: "Your Ultrawave Interactive OTP Code",
      text: `Your OTP code is: ${otp}\n\nIt expires in 5 minutes.`,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("OTP SEND ERROR:", err);
    return res.status(500).json({ error: "Server error sending OTP." });
  }
});

// ---------------------------------------------
// VERIFY OTP
// ---------------------------------------------
router.post("/verify", otpLimiter, async (req, res) => {
  try {
    const { email, otp, recaptchaToken } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Missing email or OTP." });
    }

    let emailSanitized = sanitizeEmail(email);
    let otpSanitized = sanitizeNumberString(otp);

    // 🔐 reCAPTCHA v3 Verification
    const recaptcha = await verifyRecaptchaToken(recaptchaToken, "otp");
    
    console.log("🔎 recaptcha result:", recaptcha);
    
    if (!recaptcha.success) {
      return res.status(400).json({ error: "Failed reCAPTCHA." });
    }

    // Look up user
    const user = await prisma.user.findUnique({
      where: { emailSanitized },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid user." });
    }

    // Check OTP exists
    if (!user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({ error: "No OTP request found." });
    }

    // Check expiration
    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: "OTP has expired." });
    }

    // Check match
    if (user.otpCode !== otpSanitized.trim()) {
      return res.status(400).json({ error: "Invalid OTP code." });
    }

    // Mark OTP as verified
    await prisma.user.update({
      where: { emailSanitized },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        otpVerified: true,
      },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("OTP VERIFY ERROR:", err);
    return res.status(500).json({ error: "Server error verifying OTP." });
  }
});

module.exports = router;
