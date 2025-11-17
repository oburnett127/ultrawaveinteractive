// middleware/requireOtpVerified.cjs
const prisma = require("../lib/prisma.cjs");

async function getSessionSafe(req, res) {
  try {
    const { getServerSession } = await import("next-auth/next");
    const mod = await import("../pages/api/auth/[...nextauth].js");
    const authOptions = mod.authOptions || mod.default?.authOptions;

    if (!authOptions) return null;
    return await getServerSession(req, res, authOptions);
  } catch (err) {
    console.warn("[requireOtpVerified] ⚠ Could not resolve session:", err.message);
    return null;
  }
}

/**
 * 🔐 Reusable Middleware
 * Requires:
 *  - The user must be authenticated
 *  - The user's current session must have completed OTP verification
 *
 * If not:
 *  - 401 → Not Authenticated
 *  - 403 → OTP Required
 */
async function requireOtpVerified(req, res, next) {
  try {
    // 1) Get current NextAuth session
    const session = await getSessionSafe(req, res);

    if (!session?.user?.email) {
      return res.status(401).json({
        ok: false,
        error: "User not authenticated.",
      });
    }

    // 2) Fetch user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, otpVerified: true },
    });

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: "User account not found.",
      });
    }

    // 3) Must be OTP-verified for THIS session
    if (user.otpVerified !== true) {
      return res.status(403).json({
        ok: false,
        error: "OTP verification required.",
      });
    }

    // Attach user to request for convenience
    req.user = user;

    return next();
  } catch (err) {
    console.error("[requireOtpVerified] ❌ Middleware Error:", err);
    return res.status(500).json({
      ok: false,
      error: "OTP verification check failed.",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

module.exports = requireOtpVerified;
