// /routes/blogCreate.js
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma.cjs'); // Adjust path if needed
const { generateSlug } = require('../utils/generateSlug');

// Middleware to handle large JSON payloads
router.use(express.json({ limit: '2gb' }));

router.post('/', async (req, res) => {
  try {
    let { title, content, authorId } = req.body;

    console.log("Incoming content:", content);
    console.log("Content length:", content?.length);

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    if (!authorId) {
      authorId = 'admin';
    }

    // Generate base slug
    let slug = generateSlug(title);

    // Check if slug already exists, if so, append number
    let existingPost = await prisma.blogPost.findUnique({ where: { slug } });
    let count = 1;

    while (existingPost) {
      slug = `${generateSlug(title)}-${count}`;
      existingPost = await prisma.blogPost.findUnique({ where: { slug } });
      count++;
    }

    const newPost = await prisma.blogPost.create({
      data: {
        title,
        slug,
        content,
        authorId,
      },
    });

    return res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating blog post:', error);
    return res.status(500).json({ error: 'Failed to create blog post.' });
  }
});

module.exports = router;