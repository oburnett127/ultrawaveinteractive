const { getServerSession } = require('next-auth/next');
const { authOptions } = require("../lib/authOptions.cjs"); // ✅ CommonJS-safe import
const prisma = require('../lib/prisma.cjs'); // Adjust path if needed

module.exports = async function updateTokenHandler(req, res) {
  try {
    // ✅ Get session using NextAuth (works in Express if req/res are passed)
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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
};