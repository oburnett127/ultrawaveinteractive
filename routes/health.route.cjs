const express = require("express");
const prisma = require("../lib/prisma.cjs");
const { getClient } = require("../lib/redisManager.cjs");

const router = express.Router();

// --- Helper: enforce timeout on async tasks ---
async function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} check timed out after ${ms}ms`)),
      ms
    );
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// --- GET /api/health ---
router.get("/health", async (req, res) => {
  const start = Date.now();

  let redisStatus = "unknown";
  let dbStatus = "unknown";
  let redisLatency = null;
  let dbLatency = null;

  try {
    // --- Check Redis connection ---
    const redisStart = Date.now();
    try {
      const redis = await withTimeout(getClient(), 1500, "Redis connection");
      const pingResult = await withTimeout(redis.ping(), 1500, "Redis ping");
      redisStatus = pingResult === "PONG" ? "connected" : "degraded";
    } catch (err) {
      redisStatus = "error";
      console.error("[HealthCheck] Redis check failed:", err.message);
    }
    redisLatency = Date.now() - redisStart;

    // --- Check Prisma DB connection ---
    const dbStart = Date.now();
    try {
      await withTimeout(prisma.$queryRaw`SELECT 1`, 2000, "Database query");
      dbStatus = "connected";
    } catch (err) {
      dbStatus = "error";
      console.error("[HealthCheck] Database check failed:", err.message);
    }
    dbLatency = Date.now() - dbStart;

    // --- Determine overall status ---
    const overallStatus =
      redisStatus === "connected" && dbStatus === "connected"
        ? "ok"
        : "degraded";

    // --- Build response ---
    return res.status(overallStatus === "ok" ? 200 : 503).json({
      status: overallStatus,
      uptime_seconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || "1.0.0",
      latency_ms: Date.now() - start,
      services: {
        redis: { status: redisStatus, latency_ms: redisLatency },
        database: { status: dbStatus, latency_ms: dbLatency },
      },
    });
  } catch (err) {
    console.error("[HealthCheck] ❌ Unhandled health route error:", err);
    return res.status(500).json({
      status: "error",
      error: "Internal health check failure.",
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
