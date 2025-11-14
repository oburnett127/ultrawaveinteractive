// /lib/authOptions.cjs
// ✅ All CJS-compatible, correct with NextAuth v4.24.11

// Use .default only when required:
const CredentialsProvider = require("next-auth/providers/credentials").default;
const { compare } = require("bcryptjs");
const prisma = require("./prisma.cjs");

// ✅ Node 18+ has global fetch, but make sure for safety:
const fetch = global.fetch;

// Optional: track failed login attempts (add a column in Prisma if you want to enforce a lockout policy)
async function incrementFailedLogin(email) {
  try {
    await prisma.user.update({
      where: { email },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  } catch(e) {
    console.error(`[authOptions] Failed to increment login for ${email}:`, e.message); // Add this
  }
}

async function resetFailedLogin(email) {
  try {
    await prisma.user.update({
      where: { email },
      data: { failedLoginAttempts: 0 },
    });
  } catch(e) {
    console.error(`[authOptions] Failed to reset login for ${email}:`, e.message); // Add this
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

          // ✅ reCAPTCHA check
          const validCaptcha = await verifyRecaptcha(recaptchaToken);
          if (!validCaptcha) {
            console.warn("[authorize] invalid reCAPTCHA");
            await incrementFailedLogin(email);
            return null;
          }

          // ✅ Look up user
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              hashedPassword: true,
              otpVerified: true,
              failedLoginAttempts: true
            },
          });

          if (!user?.hashedPassword) return null;

          // ✅ Account lockout (optional feature)
          if (user.failedLoginAttempts >= 5) {
            console.warn("[authorize] account locked:", email);
            return null;
          }

          // ✅ Validate password
          const isValid = await compare(password, user.hashedPassword);
          if (!isValid) {
            await incrementFailedLogin(email);
            return null;
          }

          // ✅ Reset failed login attempts on success
          await resetFailedLogin(email);

          return {
            id: user.id,
            email: user.email,
            name: user.name || null,
            otpVerified: user.otpVerified ?? false,
          };
        } catch (err) {
          console.error("[authorize] error:", err);
          throw new Error("Login failed");
        }
      },
    }),
  ],

  callbacks: {
    // ✅ Controls the data stored in the token
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.otpVerified = !!user.otpVerified;
      }

      // Handle updates when session changes
      if (trigger === "update" && session?.user?.otpVerified !== undefined) {
        token.otpVerified = !!session.user.otpVerified;
      }

      // Always refresh otpVerified from DB for accuracy
      if (token?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { otpVerified: true },
          });
          token.otpVerified = !!dbUser?.otpVerified;
        } catch (err) {
          console.error("[jwt callback] db error:", err);
        }
      }

      return token;
    },

    // ✅ Controls what is returned to the client in `useSession()`
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.otpVerified = !!token.otpVerified;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
  },

  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV !== "production", // safer than always true
  events: {
    signIn(message) {
      console.log("[nextauth event signIn]", message);
    },
    error(error) {
      console.error("[nextauth event error]", error);
    },
  },
};

module.exports = { authOptions };