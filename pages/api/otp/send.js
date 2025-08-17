// pages/api/otp/send.js
import crypto from "crypto";
import { getRedis } from "../../../lib/redis.cjs";
import { sendOtpEmail } from "../../../lib/mail.cjs";

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function genOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const { email } = req.body || {};
    if (!email) return json(res, 400, { error: "Email is required" });

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

    // For dev convenience you can return the code (comment out in prod)
    const body = { ok: true };
    if (process.env.NODE_ENV !== "production") body.devCode = otp;

    return json(res, 200, body);
  } catch (err) {
    console.error("[send-otp] error:", err);
    return json(res, 500, { error: "Failed to send OTP" });
  }
}
