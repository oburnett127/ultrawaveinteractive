// frontend/lib/authOptions.js
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {},
      authorize() {
        // ❌ NEVER used on frontend
        // Real auth happens in backend
        return null;
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

      if (trigger === "update" && session?.user?.otpVerified !== undefined) {
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

  pages: { signIn: "/signin" },
};
