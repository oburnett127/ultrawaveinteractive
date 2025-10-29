const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma.cjs");

router.get("/blog/list", async (req, res) => {
  try {
    const posts = await prisma.$queryRaw`SELECT * FROM \`BlogPost\`;`; // Notice the backticks and exact case
    res.json(posts);
  } catch (err) {
    res.json({ error: err.message });
  }
});


module.exports = router;
