// pages/api/update-token.js
import { getServerSession }   from "next-auth/next";
import { authOptions }        from "./auth/[...nextauth]";   // <- correct path
import { prisma }             from "../../lib/prisma.cjs";       // <- adjust if needed

export default async function handler(req, res) {
  console.log("authOptions keys:", Object.keys(authOptions || {}));

  if (req.method !== "GET") return res.status(405).end(); // only GET

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "Unauthorized" });

  try {
    await prisma.user.upsert({
      where:  { email: session.user.email },
      update: { otpVerified: true },
      create: {
        email: session.user.email,
        name:  session.user.name  ?? null,
        image: session.user.image ?? null,
        otpVerified: true,
      },
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("update-token failed:", e);
    return res.status(500).json({ error: "DB update failed" });
  }
}
