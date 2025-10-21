import prisma from '../../../lib/prisma.cjs';
import { generateSlug } from '../../../utils/generateSlug';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { title, content, authorId } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required.' });
      }

      if(!authorId) {
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
      console.error(error);
      return res.status(500).json({ error: 'Failed to create blog post.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
