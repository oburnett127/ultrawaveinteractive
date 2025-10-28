const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma.cjs");

router.get("/blog/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    console.log("Incoming slug:", slug);

    if (!slug) {
      return res.status(400).json({ error: "Missing slug parameter" });
    }

    const post = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.status(200).json(post);
  } catch (err) {
    console.error("Error fetching post:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
});

module.exports = router;
