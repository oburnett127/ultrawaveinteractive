// /routes/health.route.cjs
const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma.cjs");
const { getClient } = require("../lib/redisManager.cjs");

router.get("/health", async (req, res) => {
  try {
    const redis = await getClient();
    const redisStatus = await redis.ping();

    // Optional: Check database connection via Prisma
    await prisma.$queryRaw`SELECT 1`;
    const dbStatus = "ok";

    return res.json({
      status: "ok",
      uptime: process.uptime(),
      redis: redisStatus === "PONG" ? "connected" : "disconnected",
      db: dbStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
