const express = require("express");
const rateLimit = require("express-rate-limit");
const prisma = require("../lib/prisma.cjs");
const { getClient } = require("../lib/redisManager.cjs");

const router = express.Router();

// --- Rate limiter: 100 blog list requests per 15 minutes per IP ---
const blogListLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- GET /api/blog/list ---
router.get("/blog/list", blogListLimiter, async (req, res) => {
  const start = Date.now();

  // Optional pagination query parameters (default: first 10)
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50); // cap at 50
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  try {
    // --- 1️⃣ Optional caching layer ---
    let redis;
    let cacheKey;
    let cachedData;

    try {
      redis = await getClient();
      cacheKey = `blog:list:${offset}:${limit}`;
      cachedData = await redis.get(cacheKey);
      if (cachedData) {
        const posts = JSON.parse(cachedData);
        return res.status(200).json({
          source: "cache",
          count: posts.length,
          posts,
          latency_ms: Date.now() - start,
        });
      }
    } catch (cacheErr) {
      console.warn("[BlogList] ⚠️ Redis unavailable, proceeding without cache:", cacheErr.message);
    }

    // --- 2️⃣ Safe query via Prisma ORM (avoid raw SQL injection risk) ---
    const posts = await prisma.blogPost.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    // --- 3️⃣ Optional cache storage for next requests ---
    if (redis && cacheKey && posts.length > 0) {
      redis.setEx(cacheKey, 60, JSON.stringify(posts)); // 60-second cache TTL
    }

    return res.status(200).json({
      source: "db",
      count: posts.length,
      posts,
      latency_ms: Date.now() - start,
    });
  } catch (err) {
    console.error("[BlogList] ❌ Failed to fetch blog posts:", err);

    return res.status(500).json({
      error: "Internal server error while fetching blog posts.",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
