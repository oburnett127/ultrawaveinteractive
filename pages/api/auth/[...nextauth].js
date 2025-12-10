// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "../../../lib/authOptions.cjs";

export default async function handler(req, res) {
  // 🛠 Fix: NextAuth dev server incorrectly rejects this request
  if (
    req.method === "POST" &&
    Array.isArray(req.query.nextauth) &&
    req.query.nextauth[0] === "session"
  ) {
    try {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });

      return res.status(200).json({
        user: token
          ? {
              id: token.id,
              email: token.email,
              otpVerified: !!token.otpVerified,
            }
          : null,
        expires: token?.exp
          ? new Date(token.exp * 1000).toISOString()
          : null,
      });
    } catch (e) {
      console.error("POST /api/auth/session error", e);
      return res.status(200).json({ user: null, expires: null });
    }
  }

  // All other auth routes → NextAuth
  return await NextAuth(req, res, authOptions);
}
