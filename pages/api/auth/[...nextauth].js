import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generateOtp, saveOtpForEmail } from "../../../lib/otp";
import { sendOtpEmail } from "../../../lib/mailer";

const prisma = new PrismaClient();

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email:    { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const email = credentials.email.toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, email: true, hashedPassword: true, otpVerified: true, emailVerified: true },
        });
        if (!user || !user.hashedPassword) throw new Error("Invalid email or password");

        const isValid = await compare(credentials.password, user.hashedPassword);
        if (!isValid) throw new Error("Invalid email or password");

        // Reset OTP status each login (per-session MFA)
        await prisma.user.update({
          where: { id: user.id },
          data:  { otpVerified: false },
        });

        // Generate + send OTP email
        const code = generateOtp();
        await saveOtpForEmail(email, code, 300); // 5 min
        await sendOtpEmail({ to: email, code });

        // Return minimal user; otpVerified handled in token/session
        return {
          id: user.id,
          name: user.name || null,
          email: user.email,
        };
      },
    }),
  ],

  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  jwt: { secret: process.env.NEXTAUTH_SECRET },

  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },

  callbacks: {
    async jwt({ token, user }) {
      // After password login, mark not verified
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.otpVerified = false; // must verify every login
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user) session.user = {};
      if (token?.email) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.otpVerified = !!token.otpVerified;
      }
      return session;
    },
    // Ensure redirects land on /verifyotp after sign-in
    async redirect({ url, baseUrl }) {
      try {
        const u = new URL(url, baseUrl);
        // After credentials login, always send to verifyotp
        if (u.pathname.startsWith("/api/auth/signin") || u.searchParams.get("callbackUrl")) {
          return `${baseUrl}/verifyotp`;
        }
      } catch {}
      // Allow relative or same-origin
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
};

export default NextAuth(authOptions);
