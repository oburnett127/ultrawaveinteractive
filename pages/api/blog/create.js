import { getToken } from "next-auth/jwt";
import prisma from "../../../lib/prisma.cjs"; // adjust path

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const user = await prisma.user.findUnique({ where: { email: token.email } });
  if (!user?.isAdmin) return res.status(403).json({ error: "Not authorized" });

  const { title, content } = req.body;
  const slug = title.toLowerCase().replace(/\s+/g, "-");

  try {
    const post = await prisma.blogPost.create({
      data: {
        title,
        content,
        slug,
        authorId: user.id,
      },
    });

    return res.status(201).json(post);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create post", details: err.message });
  }
}
