// middleware/requireOtpVerified.cjs
const { getToken } = require("next-auth/jwt");
const prisma = require("../lib/prisma.cjs");

async function getSessionSafe(req, res) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) return null;

    return {
      user: {
        email: token.email,
        id: token.id,
        isAdmin: token.isAdmin,
        otpVerified: token.otpVerified,
      },
    };
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
  //console.log("🔎 Cookies arriving at backend:", req.headers.cookie);
  
  try {
    // 1) Get current NextAuth session
   const session = await getSessionSafe(req, res);

    if (!session || !session.user || !session.user.email) {
      return res.status(401).json({
        ok: false,
        error: "User not authenticated.",
      });
    }

    // 2) Fetch user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        otpVerified: true,
        isAdmin: true,
      },
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
