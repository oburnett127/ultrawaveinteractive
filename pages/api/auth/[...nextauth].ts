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
    strategy: "jwt", // Using JSON Web Tokens for session handling
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Add custom fields to the token
      if (account && profile) {
        token.email_verified = (profile as any).email_verified ?? false;
        token.sub = account.providerAccountId; // Map user's ID to `sub`
      }
      return token;
    },

    async session({ session, token }) {
      // Add custom fields to the session
      session.user = {
        ...session.user,
        id: token.sub, // Map the user's ID from the token
        email_verified: token.email_verified, // Map `email_verified` to the session
      };
      return session;
    },

    async redirect({ url, baseUrl }) {
      return baseUrl; // Ensure the redirect is correct
    },
  },

  // Ensure cookies are set with proper SameSite policy for cross-origin compatibility
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "none", // Allow cross-origin requests
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "none", // Allow cross-origin requests
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      },
    },
  },
};

export default NextAuth(authOptions);
