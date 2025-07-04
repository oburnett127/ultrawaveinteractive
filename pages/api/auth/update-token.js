import { getServerSession } from "next-auth/next";
import { authOptions } from "./[...nextauth].js";
import { prisma } from "../../../lib/prisma.js"; // adjust if needed

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || null,
          image: session.user.image || null,
          otpVerified: true,
        },
      });
    } else {
      await prisma.user.update({
        where: { email: session.user.email },
        data: { otpVerified: true },
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error creating or updating user:", error);
    return res.status(500).json({ error: "Failed to update OTP status" });
  }
}
