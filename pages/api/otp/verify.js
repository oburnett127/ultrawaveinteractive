// pages/api/otp/verify.js
const prisma = require("../../../lib/prisma.cjs");
const { getRedis } = require("../../../lib/redis.cjs");

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) return json(res, 400, { error: "Email and OTP are required" });

    const lower = String(email).trim().toLowerCase();
    const key = `otp:${lower}`;

    const r = await getRedis();
    const stored = await r.get(key);

    if (process.env.NODE_ENV !== "production") {
      console.log(`[verify-otp] key=${key} stored=${stored}`);
    }

    if (!stored) return json(res, 400, { error: "OTP expired or not found" });
    if (String(stored) !== String(otp)) return json(res, 401, { error: "Invalid OTP" });

    // 1) Update user
    const update = await prisma.user.update({
      where: { email: lower },
      data: { otpVerified: true, emailVerified: new Date() },
      select: { id: true, email: true, otpVerified: true },
    });

    // 2) Re-read to be 100% sure (and to return to client for debugging)
    const check = await prisma.user.findUnique({
      where: { email: lower },
      select: { id: true, email: true, otpVerified: true },
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("[verify-otp] after update:", check);
    }

    // 3) Consume OTP only after successful update
    await r.del(key);

    return json(res, 200, { ok: true, user: check });
  } catch (err) {
    console.error("[verify-otp] error:", err);
    return json(res, 500, { error: "Server error verifying OTP" });
  }
}
