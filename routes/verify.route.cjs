const prisma = require("../lib/prisma.cjs");
const getRedis = require("../lib/redis.cjs");

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

module.exports = async function verifyHandler(req, res) {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required." });
    }

    const lower = String(email).trim().toLowerCase();
    const key = `otp:${lower}`;
    const r = await getRedis();

    const storedOtp = await r.get(key);
    if (!storedOtp) {
      return res.status(400).json({ error: "OTP expired or not found." });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({ error: "Invalid OTP." });
    }

    // ✅ OTP is correct — delete it to prevent reuse
    await r.del(key);

    // ✅ Update user in Prisma
    const updatedUser = await prisma.user.update({
      where: { email: lower },
      data: {
        otpVerified: true,
        emailVerified: new Date(),
      },
      select: {
        id: true,
        email: true,
        otpVerified: true,
      },
    });

    return res.status(200).json({
      ok: true,
      message: "OTP verified successfully.",
      user: updatedUser,
    });

  } catch (err) {
    console.error("[otp/verify] error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
};