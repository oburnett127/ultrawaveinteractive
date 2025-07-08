import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../lib/prisma.js"; // adjust path if needed
import { refreshIdToken } from "../../../utility/auth.js";

const authOptions = {
  adapter: PrismaAdapter(prisma),
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
        console.log("account.id_token:", account.id_token);
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.idTokenExpires = Date.now() + account.expires_in * 1000;
        token.email = user.email;
      }

      // Fetch otpVerified from DB if not set
      if (user?.otpVerified !== undefined) {
        token.otpVerified = user.otpVerified;
      } else if (token?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        token.otpVerified = dbUser?.otpVerified ?? false;
      }

      // Token refresh logic
      if (Date.now() < token.idTokenExpires) return token;

      try {
        const refreshedToken = await refreshIdToken(token.refreshToken);
        return {
          ...token,
          idToken: refreshedToken.idToken,
          idTokenExpires: refreshedToken.idTokenExpires,
          refreshToken: refreshedToken.refreshToken ?? token.refreshToken,
        };
      } catch (err) {
        console.error("Error refreshing token:", err);
        token.error = "RefreshAccessTokenError";
        return token;
      }
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub;
        session.user.idToken = token.idToken;
        session.user.email = token.email;
        session.user.refreshToken = token.refreshToken;
        session.user.otpVerified = token.otpVerified ?? false;
        session.error = token.error;
      }
      return session;
    },
  },
  session: { 
             strategy: "jwt",
             trust: true,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  events: {
    async createUser(user) {
      console.log("🟢 User created:", user);
    },
    async linkAccount(account) {
      console.log("🔗 Account linked:", account);
    },
  }
};

export default function authHandler(req, res) {
  return NextAuth(req, res, authOptions);
}
