// pages/api/auth/[...nextauth].js
import NextAuth            from "next-auth";
import GoogleProvider       from "next-auth/providers/google";
import { PrismaAdapter }    from "@next-auth/prisma-adapter";
import { prisma }           from "../../../lib/prisma.js";          // ← adjust if needed
import { refreshIdToken }   from "../../../utility/auth.js";        // ← adjust if needed

/* ────────────────────────────────────────────────────────── */
/* 1. CONFIG OBJECT                                           */
/* ────────────────────────────────────────────────────────── */
export const authOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID     ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope:       "openid email profile",
          access_type: "offline",
          prompt:      "consent",
        },
      },
    }),
  ],

  session: {
    strategy: "jwt",
    trust:    true,          // needed behind proxy / custom server
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug:  true,

  cookies: {
    sessionToken: {
      name:   "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path:     "/",
        secure:   process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name:   "next-auth.csrf-token",
      options: {
        httpOnly: false,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path:     "/",
        secure:   process.env.NODE_ENV === "production",
      },
    },
  },

  /* ── CALLBACKS ─────────────────────────────────────────── */
  callbacks: {
    // Runs on first sign-in
    async signIn({ user, account }) {
      return true; // allow all
    },

    // JWT callback – adds/refreshes Google tokens + otpVerified flag
    async jwt({ token, account, user }) {
      if (account) {
        token.idToken        = account.id_token;
        token.refreshToken   = account.refresh_token;
        token.idTokenExpires = Date.now() + account.expires_in * 1000;
        token.email          = user.email;
      }

      // 🔄 always refresh if it's still false
      if (token.email && token.otpVerified !== true) {
        const dbUser = await prisma.user.findUnique({
          where:   { email: token.email },
          select:  { otpVerified: true },
        });
        token.otpVerified = dbUser?.otpVerified ?? false;
      }

      // Refresh Google ID-token if expired
      if (token.idTokenExpires && Date.now() > token.idTokenExpires) {
        try {
          const refreshed = await refreshIdToken(token.refreshToken);
          token.idToken        = refreshed.idToken;
          token.idTokenExpires = refreshed.idTokenExpires;
          token.refreshToken   = refreshed.refreshToken ?? token.refreshToken;
        } catch (err) {
          console.error("⚠️  ID-token refresh failed:", err);
          token.error = "RefreshTokenError";
        }
      }

      return token;
    },

    // Makes the token fields available on `session.user`
    async session({ session, token }) {
      if (token) {
        session.user.id           = token.sub;
        session.user.idToken      = token.idToken;
        session.user.email        = token.email;
        session.user.refreshToken = token.refreshToken;
        session.user.otpVerified  = token.otpVerified ?? false;
        session.error             = token.error;
      }
      return session;
    },
  },

  /* ── OPTIONAL EVENTS (logging) ─────────────────────────── */
  events: {
    async createUser(user)    { console.log("🟢 New user:", user.email); },
    async linkAccount(acc)    { console.log("🔗 Linked:", acc.provider); },
  },
};

/* ────────────────────────────────────────────────────────── */
/* 2. SINGLE default export                                  */
/* ────────────────────────────────────────────────────────── */
export default NextAuth(authOptions);
