// /middleware/nextAuthMiddleware.cjs
const { getServerSession } = require("next-auth/next");
const { authOptions } = require("../lib/authOptions.cjs"); // ✅ Ensure this exports your NextAuth config

export async function middleware(req, res, next) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    // ✅ Attach the authenticated user to the request
    req.user = session.user;

    next();
  } catch (err) {
    console.error("NextAuth middleware error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};