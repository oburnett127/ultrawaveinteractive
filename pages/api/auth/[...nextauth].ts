import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Extend the `User`, `Session`, and `JWT` types to include custom fields
declare module "next-auth" {
  interface User {
    email_verified?: boolean;
  }

  interface Session {
    user: {
      id?: string; // Add the 'id' field
      email_verified?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email_verified?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "clientid-not-present",
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || "client-secret-not-present",
    }),
  ],
  debug: true,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // console.log("JWT callback - token before:", token);
      // console.log("JWT callback - account:", account);
      // console.log("JWT callback - profile:", profile);

      // Add custom fields to the token
      if (account && profile) {
        token.email_verified = (profile as any).email_verified ?? false;
        token.sub = account.providerAccountId; // Map user's ID to `sub`
      }

      //console.log("JWT callback - token after:", token);
      return token;
    },

    async session({ session, token }) {
      //console.log("Session callback - token:", token);

      // Add custom fields to the session
      session.user = {
        ...session.user,
        id: token.sub, // Map the user's ID from the token
        email_verified: token.email_verified, // Map `email_verified` to the session
      };

      //console.log("Session callback - session:", session);
      return session;
    },
    async redirect({ url, baseUrl }) {
      // console.log("Redirect callback - url:", url);
      // console.log("Redirect callback - baseUrl:", baseUrl);
      return baseUrl; // Ensure the redirect is correct
    },
  },
};

export default NextAuth(authOptions);
