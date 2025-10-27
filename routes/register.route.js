const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma.cjs");
const { hash } = require("bcryptjs");

// Server-side verification of v2 checkbox token
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
    body: params.toString()
  });

  const data = await resp.json();
  return Boolean(data && data.success);
}

router.post("/auth/register", async (req, res) => {
  try {
    const { emailText, password, name, recaptchaToken } = req.body || {};

    if (!emailText || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    if (!recaptchaToken) {
      return res.status(400).json({ error: "Missing reCAPTCHA token." });
    }

    const ok = await verifyRecaptchaToken(recaptchaToken);
    if (!ok) {
      return res.status(400).json({ error: "Failed reCAPTCHA verification." });
    }

    const email = String(emailText).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return res.status(409).json({ error: "Email is already registered." });
    }

    const hashedPassword = await hash(String(password), 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: name ? String(name).trim() : null,
        hashedPassword,
        otpVerified: false,
        isAdmin: false
      },
      select: { id: true, email: true }
    });

    return res.status(201).json({ ok: true, user });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({
      error: "Server error",
      message: err.message,
      full: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
  }
});

module.exports = router;

