import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
            clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || "",
            authorization: {
              params: {
                scope: "openid email profile", // Include email_verified
              },
            },
          }),
  ],
  debug: process.env.NODE_ENV !== "production", // Enable debug logs only in development
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.idToken = account.id_token;
        token.email_verified = (profile as any).email_verified ?? false; // Add `email_verified`
        token.sub = account.providerAccountId; // Store the user's unique ID
        token.email = profile.email; // Store the email
        token.otpVerified = token.otpVerified ?? false; // Default OTP verification to false
      }
      return token;
    },
    async session({ session, token }) {
      // Add custom fields to the session object
      session.user = {
        ...session.user,
        idToken: token.idToken,
        id: token.sub, // Add the user's unique ID
        email_verified: token.email_verified, // Add `email_verified`
        otpVerified: token.otpVerified, // Add `otpVerified`
      };
      return session;
    },
  },
  cookies: {
    csrfToken: {
          name: "next-auth.csrf-token",
          options: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Only secure in production
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "lax" for local dev
            path: "/",
          },
        },
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "lax" : "none",
        secure: process.env.NODE_ENV === "production",
        path: "/", // <-- Also set sessionToken cookie's path to `/`
        domain: "localhost",
      },
    },
  },
};

export default NextAuth(authOptions);
