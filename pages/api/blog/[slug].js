import prisma from "../../../lib/prisma.cjs";

export default async function handler(req, res) {
  const slug = req.query.slug;
  console.log("Incoming slug:", slug); // ADD THIS

  const post = await prisma.blogPost.findUnique({
    where: { slug },
  });

  if (!post) return res.status(404).json({ error: "Not found" });

  res.status(200).json(post);
}
