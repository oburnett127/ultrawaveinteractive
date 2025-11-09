// /routes/list.route.cjs
const prisma = require("../lib/prisma.cjs");
const express = require('express');
const router = express.Router();

router.get("/blog/list", async (req, res) => {
  try {
    const posts = await prisma.$queryRaw`SELECT * FROM \`BlogPost\`;`; // Uses raw SQL
    res.json(posts);
  } catch (err) {
    console.error("Failed to fetch blog posts:", err.message);
    res.status(500).json({ error: "Failed to load blog posts" });
  }
});

module.exports = router;
