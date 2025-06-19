// pages/api/auth/[...nextauth].mjs

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { refreshIdToken } from "../../../utility/auth.js";

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      return true;
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.idTokenExpires = Date.now() + account.expires_in * 1000;
      }

      if (user?.otpVerified !== undefined) {
        token.otpVerified = user.otpVerified;
      }

      token.otpVerified = token.otpVerified ?? false;

      if (Date.now() < token.idTokenExpires) return token;

      const refreshedToken = await refreshIdToken(token.refreshToken);
      return {
        ...token,
        idToken: refreshedToken.idToken,
        idTokenExpires: refreshedToken.idTokenExpires,
        refreshToken: refreshedToken.refreshToken,
      };
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub;
        session.user.idToken = token.idToken;
        session.user.refreshToken = token.refreshToken;
        session.user.otpVerified = token.otpVerified ?? false;
        session.error = token.error;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};

export default function authHandler(req, res) {
  return NextAuth(req, res, authOptions);
}
