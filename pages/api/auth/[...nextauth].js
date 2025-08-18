// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "../../../lib/prisma.cjs";

export default NextAuth({
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.hashedPassword) return null;
        const ok = await compare(password, user.hashedPassword);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name || null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // set email when user signs in
      if (user?.email) token.email = user.email;

      // allow client to explicitly update otpVerified via session.update()
      if (trigger === "update" && session?.user) {
        if (typeof session.user.otpVerified !== "undefined") {
          token.otpVerified = !!session.user.otpVerified;
        }
      } else if (token?.email) {
        // on normal requests, sync from DB
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { otpVerified: true },
        });
        token.otpVerified = !!dbUser?.otpVerified;
      }

      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.email = token.email;
        session.user.otpVerified = !!token.otpVerified;
      }
      return session;
    },
  },
  pages: { signIn: "/auth/signin" },
});
