const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma.cjs");

router.get("/blog/list", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await prisma.blogPost.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, slug: true, createdAt: true },
    });

    res.status(200).json(posts);
  } catch (err) {
    console.error("[GET /blog/list] Error:", err);
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

module.exports = router;
