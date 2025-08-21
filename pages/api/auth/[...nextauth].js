// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "../../../lib/prisma.cjs";

/**
 * Verify Google reCAPTCHA (v2 checkbox or v3)
 * Client must pass `recaptchaToken` via signIn('credentials', { ..., recaptchaToken })
 */
async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY; // MUST be set in Northflank
  if (!secret) {
    console.warn("[nextauth] RECAPTCHA_SECRET_KEY is missing");
    return false;
  }
  if (!token) {
    console.warn("[nextauth] recaptcha token missing");
    return false;
  }

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

    // For v2 checkbox, success is typically enough.
    // If you use v3, also inspect data.score/action.
    if (!data?.success) {
      console.warn("[nextauth] recaptcha failed", data);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[nextauth] recaptcha verify error:", e);
    return false;
  }
}

export const authOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email:    { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        recaptchaToken: { label: "reCAPTCHA", type: "text" }, // passed from client
      },
      authorize: async (credentials, req) => {
        try {
          const email = String(credentials?.email || "").trim().toLowerCase();
          const password = String(credentials?.password || "");
          const recaptchaToken = credentials?.recaptchaToken;

          if (!email || !password) {
            console.warn("[authorize] missing email or password");
            return null;
          }

          // 1) Verify reCAPTCHA server-side
          const captchaOk = await verifyRecaptcha(recaptchaToken);
          if (!captchaOk) {
            console.warn("[authorize] recaptcha rejected");
            return null; // Triggers CredentialsSignin
          }

          // 2) Find user
          const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, hashedPassword: true },
          });
          if (!user || !user.hashedPassword) {
            console.warn("[authorize] user not found or missing hashedPassword");
            return null;
          }

          // 3) Check password
          const ok = await compare(password, user.hashedPassword);
          if (!ok) {
            console.warn("[authorize] bad password");
            return null;
          }

          // 4) Return a minimal user object (controls what gets merged into JWT)
          return { id: user.id, email: user.email, name: user.name || null };
        } catch (err) {
          // Throwing here also yields CredentialsSignin but keeps stack in logs
          console.error("[authorize] error:", err);
          throw err;
        }
      },
    }),
  ],

  // Keep your existing callbacks, just add id → token/session
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On sign in, persist essentials
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }

      // Your existing otpVerified propagation logic
      if (trigger === "update" && session?.user) {
        if (typeof session.user.otpVerified !== "undefined") {
          token.otpVerified = !!session.user.otpVerified;
        }
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
        // ensure id/email flow to the client session
        if (token?.id) session.user.id = token.id;
        if (token?.email) session.user.email = token.email;
        session.user.otpVerified = !!token.otpVerified;
      }
      return session;
    },
  },

  pages: { signIn: "/auth/signin" },

  // Important in prod behind proxies (Cloudflare/Northflank)
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,

  // Helpful logging while you debug 401s
  debug: true,
  events: {
    signIn(message) { console.log("[nextauth event signIn]", message); },
    error(error) { console.error("[nextauth event error]", error); },
  },
};

export default NextAuth(authOptions);
