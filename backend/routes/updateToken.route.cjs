// /routes/updateToken.route.cjs
const express = require("express");
const { getServerSession } = require("next-auth/next");
const prisma = require("../lib/prisma.cjs");
const { authOptions } = require("../lib/authOptions.cjs");
const requireOtpVerified = require("../guards/requireOtpVerified.cjs");

const router = express.Router();

/**
 * POST /api/update-token
 * Marks the current authenticated user as OTP verified.
 */
router.post("/update-token", requireOtpVerified, async (req, res) => {
  const start = Date.now();
  try {
    // --- 1️⃣ Validate session ---
    const session = await getServerSession(req, res, authOptions).catch((err) => {
      console.error("[update-token] Session retrieval error:", err.message);
      return null;
    });

    if (!session?.user?.email) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized — no valid session found.",
      });
    }

    const email = String(session.user.email).trim().toLowerCase();
    const name = session.user.name ? String(session.user.name).trim() : null;
    const image = session.user.image ? String(session.user.image).trim() : null;

    // --- 2️⃣ Update or create user record safely ---
    let updated;
    try {
      updated = await prisma.user.upsert({
        where: { email },
        update: { otpVerified: true },
        create: {
          email,
          name,
          image,
          otpVerified: true,
          isAdmin: false,
        },
        select: { id: true, email: true, otpVerified: true, updatedAt: true },
      });
    } catch (dbErr) {
      console.error("[update-token] Database upsert error:", dbErr);
      return res.status(500).json({
        ok: false,
        error: "Failed to update user record.",
        message:
          process.env.NODE_ENV === "development" ? dbErr.message : undefined,
      });
    }

    // --- 3️⃣ Response ---
    console.info(
      `[update-token] ✅ User ${email} verified OTP in ${Date.now() - start}ms`
    );

    return res.status(200).json({
      ok: true,
      message: "OTP verification updated successfully.",
      user: updated,
    });
  } catch (err) {
    console.error("[update-token] ❌ Unhandled error:", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error.",
      message:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

module.exports = router;