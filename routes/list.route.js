const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma.cjs");

router.get("/blog/list", async (req, res) => {
  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      content: true,
    },
  });

  res.status(200).json(posts);
});

module.exports = router;