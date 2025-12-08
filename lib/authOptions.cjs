// /lib/authOptions.cjs
// ✅ All CJS-compatible, correct with NextAuth v4.24.11

// Use .default only when required:
const CredentialsProvider = require("next-auth/providers/credentials").default;
const { compare } = require("bcryptjs");
const prisma = require("./prisma.cjs");
const bcrypt = require("bcrypt");

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const isProd = process.env.NODE_ENV === "production";

// ✅ Node 18+ has global fetch, but make sure for safety:
const fetch = global.fetch;

// Optional: track failed login attempts (add a column in Prisma if you want to enforce a lockout policy)
async function incrementFailedLogin(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return;

  try {
    const user = await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
      select: {
        id: true,
        failedLoginAttempts: true,
      },
    });

    console.warn(
      `[authOptions] Failed login attempt for ${normalizedEmail}. Total: ${user.failedLoginAttempts}`
    );

    return user; // Allows calling code to apply lockout if needed
  } catch (err) {
    if (err.code === "P2025") {
      console.warn(
        `[authOptions] incrementFailedLogin: No user found for ${normalizedEmail}`
      );
      return null;
    }

    console.error(
      `[authOptions] incrementFailedLogin ERROR for ${normalizedEmail}:`,
      err
    );

    throw err; // critical DB failure → don't swallow silently
  }
}

async function resetFailedLogin(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return;

  try {
    const user = await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null, // resets lockout state too
      },
      select: { id: true },
    });

    console.info(
      `[authOptions] Reset failed login attempts for: ${normalizedEmail}`
    );

    return user;
  } catch (err) {
    if (err.code === "P2025") {
      console.warn(
        `[authOptions] resetFailedLogin: No user found for ${normalizedEmail}`
      );
      return null;
    }

    console.error(
      `[authOptions] resetFailedLogin ERROR for ${normalizedEmail}:`,
      err
    );

    throw err; // DB failure must bubble up
  }
}

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

    if (res.status === 429) {
      console.warn("Rate limited. Backing off.");
      return false; // <-- Change from 'return;' to 'return false;'
    }
      
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return !!data?.success;
  } catch (e) {
    console.error("[authOptions] recaptcha verify error:", e);
    return false;
  }
}

const authOptions = {
  session: { strategy: "jwt" },
  csrfToken: false,
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
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        recaptchaToken: { label: "reCAPTCHA", type: "text" },
      },

      authorize: async (credentials, req) => {
        try {
          const email = String(credentials?.email || "").trim().toLowerCase();
          const password = String(credentials?.password || "");
          const recaptchaToken = credentials?.recaptchaToken;

          if (!email || !password) return null;

          // 🔐 Verify reCAPTCHA BEFORE user lookup to avoid email enumeration
          const validCaptcha = await verifyRecaptcha(recaptchaToken);
          if (!validCaptcha) {
            console.warn("[authorize] Invalid reCAPTCHA");
            await incrementFailedLogin(email); // Still count this as failed attempt
            throw new Error("Invalid login attempt.");
          }

          // 🔍 Find user including lockout field
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              hashedPassword: true,
              otpVerified: true,
              failedLoginAttempts: true,
              lockoutUntil: true, // <-- NEW
            },
          });

          // For security: do NOT indicate if user exists or not
          if (!user?.hashedPassword) {
            console.warn("[authorize] No user or missing password for:", email);
            await incrementFailedLogin(email);
            throw new Error("Invalid login attempt.");
          }

          // 🚫 Check active lockout status
          if (user.lockoutUntil && user.lockoutUntil > new Date()) {
            console.warn("[authorize] Account locked:", email);
            throw new Error(
              "Your account is temporarily locked due to multiple failed login attempts. Please wait a few minutes and try again."
            );
          }

          // 🔑 Validate password
          const isValid = await compare(password, user.hashedPassword);
          if (!isValid) {
            console.warn("[authorize] Incorrect password:", email);

            const newAttempts = user.failedLoginAttempts + 1;

            // ⛔ Lock if threshold hit
            if (newAttempts >= 5) {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  failedLoginAttempts: newAttempts,
                  lockoutUntil: new Date(Date.now() + 15 * 60 * 1000), // lock 15 minutes
                },
              });

              throw new Error(
                "Too many failed attempts. Your account is temporarily locked for 15 minutes."
              );
            }

            await incrementFailedLogin(email);
            throw new Error("Invalid login attempt.");
          }

          // 🎉 SUCCESS — reset attempts + unlock account
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockoutUntil: null,
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name || null,
            otpVerified: user.otpVerified ?? false,
          };
        } catch (err) {
          console.error("[authorize] error:", err);
          throw new Error("Login failed. " + err);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // When user signs in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.otpVerified = !!user.otpVerified; // read once only
      }

      // When OTP verification updates the session explicitly
      if (trigger === "update" && session?.user?.otpVerified !== undefined) {
        token.otpVerified = !!session.user.otpVerified;
      }

      return token; // IMPORTANT: no Prisma calls here
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.email = token.email;
      session.user.otpVerified = !!token.otpVerified;
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },

  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV !== "production", // safer than always true
  events: {
    signIn(message) {
      //console.log("[nextauth event signIn]", message);
    },
    error(error) {
      //console.error("[nextauth event error]", error);
    },
  },
};

module.exports = { authOptions };