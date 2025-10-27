// /lib/authOptions.cjs
const CredentialsProvider = require("next-auth/providers/credentials").default;
const { compare } = require("bcryptjs");
const prisma = require("./prisma.cjs"); // Your Prisma client (CJS export)

async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !token) return false;

  try {
    const params = new URLSearchParams();
    params.set("secret", secret);
    params.set("response", token);

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();
    return !!data?.success;
  } catch (e) {
    console.error("[authOptions] recaptcha verify error:", e);
    return false;
  }
}

const authOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email:          { label: "Email", type: "email" },
        password:       { label: "Password", type: "password" },
        recaptchaToken: { label: "reCAPTCHA", type: "text" },
      },
      authorize: async (credentials, req) => {
        try {
          const email = String(credentials?.email || "").trim().toLowerCase();
          const password = String(credentials?.password || "");
          const recaptchaToken = credentials?.recaptchaToken;

          if (!email || !password) return null;

          // 1) CAPTCHA
          const okCaptcha = await verifyRecaptcha(recaptchaToken);
          if (!okCaptcha) return null;

          // 2) Lookup user
          const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, hashedPassword: true },
          });
          if (!user?.hashedPassword) return null;

          // 3) Password
          const ok = await compare(password, user.hashedPassword);
          if (!ok) return null;

          // 4) Minimal user → JWT
          return { id: user.id, email: user.email, name: user.name || null };
        } catch (err) {
          console.error("[authorize] error:", err);
          throw err;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      if (trigger === "update" && session?.user && typeof session.user.otpVerified !== "undefined") {
        token.otpVerified = !!session.user.otpVerified;
      } else if (token?.email) {
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
        if (token?.id) session.user.id = token.id;
        if (token?.email) session.user.email = token.email;
        session.user.otpVerified = !!token.otpVerified;
      }
      return session;
    },
  },

  pages: { signIn: "/auth/signin" },

  // Behind proxies (Cloudflare/Northflank)
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,

  debug: true,
  events: {
    signIn(message) { console.log("[nextauth event signIn]", message); },
    error(error)    { console.error("[nextauth event error]", error); },
  },
};

module.exports = { authOptions };
