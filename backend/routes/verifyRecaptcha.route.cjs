// /routes/verifyRecaptcha.route.cjs
const express = require("express");
const { createRedisClient } = require("./lib/redisClient.cjs");

const router = express.Router();

// --- Utility: consistent JSON response ---
function respond(res, status, body) {
  res.status(status).json(body);
}

// --- Verify Google reCAPTCHA Token ---
async function verifyRecaptchaToken(token) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const verificationURL = "https://www.google.com/recaptcha/api/siteverify";

  if (!token) {
    return { success: false, "error-codes": ["missing-input-response"] };
  }
  if (!secretKey) {
    console.error("[verify-recaptcha] ❌ Missing reCAPTCHA secret key in environment variables.");
    return { success: false, "error-codes": ["missing-secret-key"] };
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", secretKey);
    params.append("response", token);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(verificationURL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[verify-recaptcha] ⚠️ HTTP ${response.status}: ${response.statusText}`);
      return { success: false, "error-codes": ["verification-failed"] };
    }

    const data = await response.json();

    // Handle Google’s failure response
    if (!data.success) {
      console.warn("[verify-recaptcha] ⚠️ Verification failed:", data["error-codes"]);
      return {
        success: false,
        "error-codes": data["error-codes"] || ["verification-failed"],
      };
    }

    return data; // always return Google's response if success === true
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("[verify-recaptcha] ⏱️ Request timed out.");
      return { success: false, "error-codes": ["timeout"] };
    }
    console.error("[verify-recaptcha] ❌ Error verifying token:", error.message);
    return { success: false, "error-codes": ["internal-error"] };
  }
}

// --- Per-IP rate limiter via Redis ---
async function incrementRate(ip) {
  try {
    const redis = await createRedisClient();
    const rateKey = `rate:recaptcha:${ip}`;
    const attempts = await redis.incr(rateKey);

    if (attempts === 1) {
      await redis.expire(rateKey, 60); // 60s window
    }
    return { ok: true, attempts, redis };
  } catch (err) {
    console.error("[verify-recaptcha] ⚠️ Redis unavailable, skipping rate limit:", err.message);
    return { ok: false, attempts: 0, redis: null }; // continue without breaking API
  }
}

// --- Main Route ---
router.post("/verify-recaptcha", async (req, res) => {
  const start = Date.now();

  try {
    const { recaptchaToken } = req.body || {};
    if (!recaptchaToken) {
      return respond(res, 400, { ok: false, error: "Token missing." });
    }

    // --- Rate limit by IP ---
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const { ok: redisOk, attempts } = await incrementRate(ip);

    if (redisOk && attempts > 10) {
      console.warn(`[verify-recaptcha] 🚫 Too many attempts from IP: ${ip}`);
      return respond(res, 429, {
        ok: false,
        error: "Too many reCAPTCHA verification attempts. Please wait a minute and try again.",
      });
    }

    // --- Verify token with Google ---
    const data = await verifyRecaptchaToken(recaptchaToken);

    if (data.success) {
      console.info(`[verify-recaptcha] ✅ Success for ${ip} (${Date.now() - start}ms)`);
      return respond(res, 200, {
        ok: true,
        message: "reCAPTCHA verification successful.",
        latencyMs: Date.now() - start,
        ...(process.env.NODE_ENV !== "production" ? { debug: data } : {}),
      });
    }

    console.warn(`[verify-recaptcha] ❌ Failed for ${ip}:`, data["error-codes"]);
    return respond(res, 400, {
      ok: false,
      error: "reCAPTCHA verification failed.",
      details: data["error-codes"],
    });
  } catch (err) {
    console.error("[verify-recaptcha] ❌ Unhandled error:", err);
    return respond(res, 500, {
      ok: false,
      error: "Internal server error.",
      message:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

module.exports = router;