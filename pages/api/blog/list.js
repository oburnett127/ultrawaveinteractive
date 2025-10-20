// /pages/api/blog/list.js
import prisma from "../../../lib/prisma.cjs";

export default async function handler(req, res) {
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
}
