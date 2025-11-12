const express = require("express");
const prisma = require("../lib/prisma.cjs");
const { generateSlug } = require("../utils/generateSlug");
const sanitizeHtml = require("sanitize-html");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// --- Rate limit to prevent abuse (5 blog posts per hour per IP) ---
const blogCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Too many blog posts created. Please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Middleware to handle large payloads safely ---
router.use(express.json({ limit: "2mb" })); // 2MB is plenty for text content

// --- POST /api/blog/create ---
router.post("/blog/create", blogCreateLimiter, async (req, res) => {
  try {
    let { title, content, authorId } = req.body || {};

    // --- Validate request body ---
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required." });
    }
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Content is required." });
    }

    // Optional: sanitize content to prevent XSS if this HTML is ever rendered raw
    const cleanContent = sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
      allowedAttributes: { "*": ["href", "src", "alt", "title"] },
    });

    // --- Assign default author ---
    if (!authorId || typeof authorId !== "string") {
      authorId = "admin";
    }

    // --- Generate unique slug with concurrency safety ---
    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let attempt = 1;

    // Avoid infinite loops (e.g. corrupted DB)
    const MAX_SLUG_ATTEMPTS = 50;

    while (attempt <= MAX_SLUG_ATTEMPTS) {
      const existing = await prisma.blogPost.findUnique({ where: { slug } });
      if (!existing) break;
      slug = `${baseSlug}-${attempt}`;
      attempt++;
    }

    if (attempt > MAX_SLUG_ATTEMPTS) {
      console.error("[BlogCreate] Too many slug conflicts for title:", title);
      return res.status(500).json({ error: "Unable to generate unique slug." });
    }

    // --- Create post in database ---
    const newPost = await prisma.blogPost.create({
      data: {
        title: title.trim(),
        slug,
        content: cleanContent,
        authorId,
      },
    });

    console.info(`[BlogCreate] ✅ Blog post created: ${slug}`);
    return res.status(201).json({
      message: "Blog post created successfully.",
      post: {
        id: newPost.id,
        title: newPost.title,
        slug: newPost.slug,
        createdAt: newPost.createdAt,
        authorId: newPost.authorId,
      },
    });
  } catch (error) {
    console.error("[BlogCreate] ❌ Error creating blog post:", error);

    // Prisma-specific error handling
    if (error.code === "P2002") {
      // Unique constraint violation
      return res.status(409).json({ error: "A post with this slug already exists." });
    }

    if (error.code === "P2000") {
      // Value too long for column
      return res.status(400).json({ error: "Input too large for database column." });
    }

    return res.status(500).json({
      error: "Internal server error while creating blog post.",
      message: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
