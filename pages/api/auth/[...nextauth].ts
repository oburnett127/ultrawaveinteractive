// pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Extend the `User` and `Session` types to include `email_verified`
declare module "next-auth" {
  interface User {
    email_verified?: boolean;
  }

  interface Session {
    user: {
      email_verified?: boolean;
    } & DefaultSession["user"];
  }
}

// Extend the `JWT` type to include `email_verified`
declare module "next-auth/jwt" {
  interface JWT {
    email_verified?: boolean;
  }
}

// Define and export the NextAuth options object
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "clientid-not-present",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "client-secret-not-present",
    }),
  ],
  debug: true,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Redirect to the payment page if the user is signing in
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default redirect to payment page after sign-in
      return baseUrl + "/payment";
    },
    async jwt({ token, account, profile }) {
      // Add `email_verified` to the JWT token on first sign-in
      if (account && profile) {
        token.email_verified = (profile as any).email_verified ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      // Pass `email_verified` to the session object
      session.user.email_verified = token.email_verified;
      return session;
    },
  },
};

// Pass the authOptions to the NextAuth handler
export default NextAuth(authOptions);
