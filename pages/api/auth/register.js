const bcrypt = require("bcryptjs");
const prisma = require("../../../lib/prisma.cjs");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, name } = req.body;

  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword,
    },
  });

  res.status(201).json({ message: "User created", user: { id: user.id, email: user.email } });
}
