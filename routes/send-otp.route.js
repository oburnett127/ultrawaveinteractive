const express = require("express");
const router = express.Router();
const { getServerSession } = require("next-auth/next");
const { authOptions } = require("../pages/api/auth/[...nextauth]");
const canResendOtp = require("../lib/otp.cjs");
const generateOtp = require("../lib/otp.cjs");
const saveOtpForEmail = require("../lib/otp.cjs");
const sendOtpEmail = require("../lib/mailer.cjs");
const { RouterContext } = require("next/dist/shared/lib/router-context.shared-runtime");

router.post("/auth/send-otp", async (req, res) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "Unauthorized" });

  const email = session.user.email.toLowerCase();

  if (!(await canResendOtp(email))) {
    return res.status(429).json({ error: "Please wait before requesting another code." });
  }

  try {
    const code = generateOtp();
    await saveOtpForEmail(email, code, 300);
    await sendOtpEmail({ to: email, code });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("send-otp error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = RouterContext;