// pages/api/auth/[...nextauth].js   (CommonJS)
const NextAuth          = require("next-auth").default ?? require("next-auth");
const { PrismaAdapter } = require("@next-auth/prisma-adapter");
const prisma            = require("../../../lib/prisma.cjs");            // <- make sure prisma.js uses module.exports

// --- pull provider, unwrap .default if present ----
const gpMod         = require("next-auth/providers/google");
const GoogleProvider = require("next-auth/providers/google").default

// ----------------------------------------------------------------
const authOptions = {
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

  session:  { strategy: "jwt", trust: true },
  secret:   process.env.NEXTAUTH_SECRET,
  debug:    true,
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

    async jwt({ token, account, user }) {
      if (account && user) {
        token.idToken        = account.id_token;
        token.refreshToken   = account.refresh_token;
        token.idTokenExpires = Date.now() + account.expires_in * 1000;
        token.email          = user.email;

        // 🟡 Save refresh token to DB if new one received
        if (account.refresh_token) {
          await prisma.user.update({
            where: { email: user.email },
            data: { refreshToken: account.refresh_token },
          });
        }
      }

      // 🟡 Always sync otpVerified
      if (token.email && token.otpVerified !== true) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { otpVerified: true },
        });
        token.otpVerified = dbUser?.otpVerified ?? false;
      }

      // 🔄 Refresh ID token if expired
      if (token.idTokenExpires && Date.now() > token.idTokenExpires) {
        try {
          const refreshed = await refreshIdToken(token.refreshToken);
          token.idToken        = refreshed.idToken;
          token.idTokenExpires = refreshed.idTokenExpires;
          token.refreshToken   = refreshed.refreshToken ?? token.refreshToken;
        } catch (err) {
          console.error("⚠️ Failed to refresh Google token:", err);
          token.error = "RefreshTokenError";
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id           = token.sub;
        session.user.idToken      = token.idToken;
        session.user.email        = token.email;
        session.user.refreshToken = token.refreshToken; // careful: don't expose to frontend in production!
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

const handler = NextAuth(authOptions);

module.exports = handler;       // CommonJS export
module.exports.default = handler; // <-- ALSO provide .default for Next.js loader