const express = require("express");
const prisma = require("../lib/prisma.cjs");
const router = express.Router();

/**
 * GET /api/blog/:slug
 * Fetches a single blog post by slug.
 */
router.get("/blog/:slug", async (req, res) => {
  const slug = req.params?.slug?.trim();

  // --- Basic validation ---
  if (!slug) {
    console.warn("[BlogRoute] Missing slug parameter in request.");
    return res.status(400).json({ error: "Missing slug parameter." });
  }

  if (!/^[a-z0-9-]+$/i.test(slug)) {
    console.warn("[BlogRoute] Invalid slug format:", slug);
    return res.status(400).json({ error: "Invalid slug format." });
  }

  try {
    // --- Fetch post safely ---
    const post = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!post) {
      console.info(`[BlogRoute] No post found for slug '${slug}'.`);
      return res.status(404).json({ error: "Post not found." });
    }

    // --- Optional: sanitize or transform output ---
    // Remove sensitive fields if your schema contains any.
    const safePost = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      content: post.content,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      authorId: post.authorId || null,
    };

    console.log(`[BlogRoute] ✅ Post retrieved successfully for slug '${slug}'.`);
    return res.status(200).json(safePost);
  } catch (err) {
    // --- Prisma-specific error handling ---
    if (err.code === "P2023") {
      console.error("[BlogRoute] Invalid ID format for Prisma query:", err);
      return res.status(400).json({ error: "Invalid request format." });
    }

    console.error("[BlogRoute] ❌ Database or server error:", err);

    return res.status(500).json({
      error: "Internal server error.",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    // --- Optional: safe Prisma disconnection in long-running servers ---
    // Avoid this if Prisma client is reused globally (as is common)
    // await prisma.$disconnect();
  }
});

module.exports = router;
