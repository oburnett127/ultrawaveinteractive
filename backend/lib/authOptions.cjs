// /lib/authOptions.cjs
const CredentialsProvider = require("next-auth/providers/credentials").default;
const { compare } = require("bcryptjs");
const prisma = require("./prisma.cjs");

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const isProd = process.env.NODE_ENV === "production";
const fetch = global.fetch;

async function incrementFailedLogin(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return;

  try {
    const user = await prisma.user.update({
      where: { email: normalizedEmail },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { id: true, failedLoginAttempts: true },
    });

    console.warn(
      `[authOptions] Failed login attempt for ${normalizedEmail}. Total: ${user.failedLoginAttempts}`
    );
    return user;
  } catch (err) {
    if (err.code !== "P2025") {
      console.error("[incrementFailedLogin] ERROR:", err);
    }
    return null;
  }
}

async function resetFailedLogin(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  try {
    return await prisma.user.update({
      where: { email: normalizedEmail },
      data: { failedLoginAttempts: 0, lockoutUntil: null },
      select: { id: true },
    });
  } catch {
    return null;
  }
}

async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !token) return false;

  try {
    const params = new URLSearchParams({
      secret,
      response: token,
    });

    const res = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }
    );

    if (!res.ok) return false;
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

const authOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {},
      authorize: async ({ email, password, recaptchaToken }) => {
        email = (email || "").trim().toLowerCase();
        if (!email || !password) return null;

        const validCaptcha = await verifyRecaptcha(recaptchaToken);
        if (!validCaptcha) {
          await incrementFailedLogin(email);
          throw new Error("Invalid login attempt.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            hashedPassword: true,
            otpVerified: true,
            failedLoginAttempts: true,
            lockoutUntil: true,
          },
        });

        if (!user?.hashedPassword) {
          await incrementFailedLogin(email);
          throw new Error("Invalid login attempt.");
        }

        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
          throw new Error("Too many failed attempts. Try again later.");
        }

        const isValid = await compare(password, user.hashedPassword);
        if (!isValid) {
          const attempts = user.failedLoginAttempts + 1;

          if (attempts >= MAX_ATTEMPTS) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: attempts,
                lockoutUntil: new Date(
                  Date.now() + LOCKOUT_MINUTES * 60000
                ),
              },
            });
            throw new Error("Account locked for 15 minutes.");
          }

          await incrementFailedLogin(email);
          throw new Error("Invalid login attempt.");
        }

        await resetFailedLogin(email);

        return {
          id: user.id,
          email: user.email,
          otpVerified: user.otpVerified ?? false,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.otpVerified = user.otpVerified;
      }

      if (
        trigger === "update" &&
        session?.user?.otpVerified !== undefined
      ) {
        token.otpVerified = !!session.user.otpVerified;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.email = token.email;
      session.user.otpVerified = !!token.otpVerified;
      return session;
    },
  },

  cookies: {
    sessionToken: {
      name: isProd
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },

  pages: { signIn: "/signin" },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  debug: !isProd,
};

module.exports = { authOptions };