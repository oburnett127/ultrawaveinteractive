// /routes/blog.route.cjs
const express = require("express");
const prisma = require("../lib/prisma.cjs");
const router = express.Router();

/**
 * GET /api/blog/:slug
 * Safely fetch a single blog post by slug.
 * Sanitized + validated + production-safe.
 */
router.get("/blog/:slug", async (req, res) => {
  try {
    let slug = req.params?.slug || "";

    // -------------------------------
    // 1) Normalize and validate slug
    // -------------------------------
    slug = slug.trim().toLowerCase();

    if (!slug) {
      console.warn("[BlogRoute] Missing slug parameter.");
      return res.status(400).json({ error: "Missing slug parameter." });
    }

    // Matches: "my-blog-post-123"
    // (Your generateSlug only generates lowercase, digits, and hyphens)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      console.warn("[BlogRoute] Invalid slug format:", slug);
      return res.status(400).json({ error: "Invalid slug format." });
    }

    // -------------------------------
    // 2) Fetch blog post safely
    // -------------------------------
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,    // already sanitized HTML stored by admin editor
        createdAt: true,
        updatedAt: true,
        authorId: true,
      },
    });

    if (!post) {
      console.info(`[BlogRoute] No post found for slug '${slug}'.`);
      return res.status(404).json({ error: "Post not found." });
    }

    // -------------------------------
    // 3) Success
    // -------------------------------
    console.info(`[BlogRoute] Retrieved post for slug '${slug}'.`);
    return res.status(200).json(post);

  } catch (err) {
    console.error("[BlogRoute] ❌ Server error:", err);

    // Prisma invalid query
    if (err.code === "P2023") {
      return res.status(400).json({ error: "Invalid query parameter format." });
    }

    return res.status(500).json({
      error: "Internal server error.",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

module.exports = router;
