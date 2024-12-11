// pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Define and export the NextAuth options object
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "clientid-not-present",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "client-secret-not-present",
    }),
  ],
  debug: true,
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Redirect to the payment page if the user is signing in
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default redirect to payment page after sign-in
      return baseUrl + "/payment";
    },
  },
};

// Pass the authOptions to the NextAuth handler
export default NextAuth(authOptions);
