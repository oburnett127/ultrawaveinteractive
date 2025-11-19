// /routes/changePassword.route.cjs
const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const prisma = require("../lib/prisma.cjs");
const verifyRecaptchaToken = require("../lib/verifyRecaptchaToken.cjs");
const requireOtpVerified = require("../middleware/requireOtpVerified.cjs");

const router = express.Router();

// ---------------------------------------------
// Rate limiter: 5 password changes per hour
// ---------------------------------------------
const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many password change attempts. Please wait before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------------------------
// POST /api/auth/change-password
// ---------------------------------------------
router.post("/auth/change-password", requireOtpVerified, changePasswordLimiter, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword, recaptchaToken } = req.body || {};

      // --------------------------------------------------
      // 1) Validate reCAPTCHA v3 token
      // --------------------------------------------------
      if (!recaptchaToken) {
        return res.status(400).json({ error: "Missing reCAPTCHA token." });
      }

      const recaptcha = await verifyRecaptchaToken(recaptchaToken, "change_password");

      if (!recaptcha.success) {
        return res.status(400).json({
          error: `Failed reCAPTCHA verification: ${recaptcha.error || "unknown"}`,
        });
      }

      // --------------------------------------------------
      // 2) Validate user auth context
      // --------------------------------------------------
      if (!userId) {
        console.warn("[ChangePassword] Missing authenticated user context.");
        return res.status(401).json({ error: "Unauthorized." });
      }

      // --------------------------------------------------
      // 3) Validate request body
      // --------------------------------------------------
      if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
        return res.status(400).json({ error: "Invalid request format." });
      }

      if (!currentPassword.trim() || !newPassword.trim()) {
        return res.status(400).json({ error: "Both fields are required." });
      }

      // --- Strong password rule ---
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters." });
      }
      if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.status(400).json({
          error: "Password must include at least one uppercase letter and one number.",
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          error: "New password cannot be the same as the current password.",
        });
      }

      // --------------------------------------------------
      // 4) Fetch user securely
      // --------------------------------------------------
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, hashedPassword: true },
      });

      if (!user) {
        console.warn(`[ChangePassword] No user found for ID: ${userId}`);
        return res.status(404).json({ error: "User not found." });
      }

      // --------------------------------------------------
      // 5) Verify current password
      // --------------------------------------------------
      const isMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
      if (!isMatch) {
        console.warn(`[ChangePassword] Incorrect password for user ID: ${userId}`);
        return res.status(401).json({ error: "Current password is incorrect." });
      }

      // --------------------------------------------------
      // 6) Hash new password
      // --------------------------------------------------
      let hashedPassword;
      try {
        hashedPassword = await bcrypt.hash(newPassword, 12);
      } catch (hashErr) {
        console.error("[ChangePassword] Error hashing password:", hashErr);
        return res.status(500).json({ error: "Password hashing failed." });
      }

      // --------------------------------------------------
      // 7) Update password in DB
      // --------------------------------------------------
      await prisma.user.update({
        where: { id: userId },
        data: { hashedPassword },
      });

      console.info(`[ChangePassword] ✅ Password updated for user ID: ${userId}`);
      return res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
      console.error("[ChangePassword] ❌ Unexpected error:", error);

      // Prisma known errors
      if (error.code === "P2025") {
        return res.status(404).json({ error: "User not found or deleted." });
      }

      return res.status(500).json({
        error: "Internal server error.",
        message:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;