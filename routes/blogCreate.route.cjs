// /routes/blogCreate.route.cjs
const express = require("express");
const prisma = require("../lib/prisma.cjs");
const sanitizeHtml = require("sanitize-html");
const rateLimit = require("express-rate-limit");
const { generateSlug } = require("../utils/generateSlug");
const requireOtpVerified = require("../middleware/requireOtpVerified.cjs");
const { sanitizeBlogTitle, sanitizeMarkdownContent } = require("../lib/sanitizers.cjs");

// Markdown → HTML converter
let marked;
(async () => {
  marked = (await import("marked")).marked;
})();


const router = express.Router();

// -----------------------------------------
// Rate limit: Protect blog-create endpoint
// -----------------------------------------
const blogCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: "Too many blog posts created. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// -----------------------------------------
// JSON body limit (protects DB + server)
// -----------------------------------------
router.use(express.json({ limit: "2mb" }));

// -----------------------------------------
// POST /api/blog/create
// Admin-only
// -----------------------------------------
router.post("/blog/create", requireOtpVerified, blogCreateLimiter, async (req, res) => {
  try {
    // -------------------------------------
    // 1) Auth check
    // -------------------------------------
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    // Admin-only blog creation
    if (!user.isAdmin) {
      console.warn(
        `[BlogCreate] Unauthorized attempt by user ${user.email || user.id}`
      );
      return res.status(403).json({ error: "Forbidden." });
    }

    // -------------------------------------
    // 2) Validate body
    // -------------------------------------
    let { title, content } = req.body || {};

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required." });
    }

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Content is required." });
    }

    // Canonicalize inputs
    title = sanitizeBlogTitle(title.trim());
    const markdownSanitized = sanitizeMarkdownContent(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        "img",
        "h1",
        "h2",
        "h3",
        "blockquote",
      ]),
      allowedAttributes: {
        "*": ["href", "src", "alt", "title", "target"],
      },
      allowedSchemes: ["http", "https", "mailto"],
      disallowedTagsMode: "discard",
    });


    // -------------------------------------
    // 3) Convert Markdown → HTML THEN sanitize HTML
    // -------------------------------------
    const htmlConverted = marked(markdownSanitized);

    const cleanContent = sanitizeHtml(htmlConverted, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        "img",
        "h1",
        "h2",
        "h3",
        "blockquote",
        "p",
        "pre",
        "code",
        "strong",
        "em",
        "ul",
        "ol",
        "li",
        "hr",
      ]),
      allowedAttributes: {
        "*": ["href", "src", "alt", "title", "target", "rel"],
      },
      allowedSchemes: ["http", "https", "mailto"],
      disallowedTagsMode: "discard",
    });

    // -------------------------------------
    // 4) Generate safe slug
    // -------------------------------------
    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let attempt = 1;
    const MAX_SLUG_ATTEMPTS = 50;

    while (attempt <= MAX_SLUG_ATTEMPTS) {
      const exists = await prisma.blogPost.findUnique({ where: { slug } });
      if (!exists) break;
      slug = `${baseSlug}-${attempt}`;
      attempt++;
    }

    if (attempt > MAX_SLUG_ATTEMPTS) {
      console.error("[BlogCreate] ❌ Slug generation loop detected.");
      return res.status(500).json({
        error: "Could not generate a unique URL for this post.",
      });
    }

    // -------------------------------------
    // 5) Create post safely
    // -------------------------------------
    const newPost = await prisma.blogPost.create({
      data: {
        title,
        slug,
        content: cleanContent,
        authorId: user.id,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
        authorId: true,
      },
    });

    console.info(
      `[BlogCreate] ✅ Blog post created by admin (${user.email}): ${slug}`
    );

    // -------------------------------------
    // 6) Return response
    // -------------------------------------
    return res.status(201).json({
      message: "Blog post created successfully.",
      post: newPost,
    });
  } catch (error) {
    console.error("[BlogCreate] ❌ Error creating blog post:", error);

    // Prisma: Unique constraint
    if (error.code === "P2002") {
      return res.status(409).json({ error: "A post with this slug already exists." });
    }

    // Prisma: Value too long
    if (error.code === "P2000") {
      return res.status(400).json({ error: "Content is too large for database column." });
    }

    return res.status(500).json({
      error: "Internal server error while creating blog post.",
      message: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
