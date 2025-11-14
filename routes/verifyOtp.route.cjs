// /routes/verifyOtp.route.cjs
const express = require("express");
const rateLimit = require("express-rate-limit");
const prisma = require("../lib/prisma.cjs");
const getRedis = require("../lib/redis.cjs");

const router = express.Router();

// --- Helper: consistent JSON response ---
function respond(res, status, body) {
  res.status(status).json(body);
}

// --- Helper: email normalization ---
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// --- Helper: per-IP rate limiter ---
const otpVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // max 10 verifications per 5 min per IP
  message: { ok: false, error: "Too many verification attempts. Please wait a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- POST /api/otp/verify ---
router.post("/otp/verify", otpVerifyLimiter, async (req, res) => {
  const start = Date.now();

  try {
    const { email, otp } = req.body || {};

    // --- 1️⃣ Validate input ---
    if (!email || !otp) {
      return respond(res, 400, { ok: false, error: "Email and OTP are required." });
    }

    const lowerEmail = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lowerEmail)) {
      return respond(res, 400, { ok: false, error: "Invalid email format." });
    }

    const code = String(otp).trim();
    if (!/^\d{6}$/.test(code)) {
      return respond(res, 400, { ok: false, error: "Invalid OTP format. Must be 6 digits." });
    }

    // --- 2️⃣ Connect to Redis ---
    let redis;
    try {
      redis = await getRedis();
    } catch (redisErr) {
      console.error("[otp/verify] ❌ Redis connection error:", redisErr.message);
      return respond(res, 503, { ok: false, error: "Temporary server issue. Please retry." });
    }

    const otpKey = `otp:${lowerEmail}`;
    const storedOtp = await redis.get(otpKey);

    // --- 3️⃣ Validate OTP existence ---
    if (!storedOtp) {
      return respond(res, 400, { ok: false, error: "OTP expired or not found." });
    }

    // --- 4️⃣ Match OTP (constant-time compare) ---
    const match =
      storedOtp.length === code.length &&
      crypto.timingSafeEqual(Buffer.from(storedOtp), Buffer.from(code));

    if (!match) {
      // Optional: small Redis counter for brute-force protection
      const failKey = `otp_fail:${lowerEmail}`;
      const fails = await redis.incr(failKey);
      if (fails === 1) await redis.expire(failKey, 300); // 5-minute window
      if (fails > 5) {
        await redis.del(otpKey); // Invalidate OTP after too many failures
        console.warn(`[otp/verify] ⚠️ ${lowerEmail} locked out after ${fails} failed attempts.`);
      }
      return respond(res, 400, { ok: false, error: "Invalid OTP." });
    }

    // --- 5️⃣ OTP correct: delete from Redis (prevent reuse) ---
    await redis.del(otpKey);
    await redis.del(`otp_fail:${lowerEmail}`);

    // --- 6️⃣ Update user in DB ---
    let updatedUser = null;
    try {
      updatedUser = await prisma.user.update({
        where: { email: lowerEmail },
        data: {
          otpVerified: true,
          emailVerified: new Date(),
        },
        select: {
          id: true,
          email: true,
          otpVerified: true,
          emailVerified: true,
          updatedAt: true,
        },
      });
    } catch (dbErr) {
      console.error("[otp/verify] ❌ Prisma update error:", dbErr);
      return respond(res, 500, { ok: false, error: "Database update failed." });
    }

    // --- 7️⃣ Respond success ---
    console.info(
      `[otp/verify] ✅ OTP verified for ${lowerEmail} in ${Date.now() - start}ms`
    );
    return respond(res, 200, {
      ok: true,
      message: "OTP verified successfully.",
      user: updatedUser,
      latencyMs: Date.now() - start,
    });
  } catch (err) {
    console.error("[otp/verify] ❌ Unhandled error:", err);
    return respond(res, 500, {
      ok: false,
      error: "Internal server error.",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

module.exports = router;