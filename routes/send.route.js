const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const getRedis = require("../lib/redis.cjs");
const sendOtpEmail = require("../lib/mail.cjs");

function genOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

router.post("/otp/send", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const lower = String(email).trim().toLowerCase();
    const otp = genOtp();
    const key = `otp:${lower}`;
    const ttlSeconds = 300; // 5 minutes

    const r = await getRedis();
    await r.set(key, otp, { EX: ttlSeconds });

    // Send the email
    await sendOtpEmail({ to: lower, code: otp });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[send-otp] key=${key} value=${otp} ttl=${ttlSeconds}s`);
    }

    const body = { ok: true };
    if (process.env.NODE_ENV !== "production") {
      body.devCode = otp; // for development only
    }

    return res.status(200).json(body);
  } catch (err) {
    console.error("[send-otp] error:", err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
});

module.exports = router;
