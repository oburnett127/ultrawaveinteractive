import { getServerSession } from "next-auth/next";
import { authOptions } from "./[...nextauth]";
import canResendOtp from "../../../lib/otp.cjs";
import generateOtp  from "../../../lib/otp.cjs";
import saveOtpForEmail from "../../../lib/otp.cjs";
import  sendOtpEmail from "../../../lib/mailer.cjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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
}
