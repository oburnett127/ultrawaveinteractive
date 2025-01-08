import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { refreshIdToken } from '../../../utility/auth';

// Define the authOptions with explicit typing
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/userinfo.email",
          access_type: "offline", // Request a refresh token
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: { token: any; account?: any; user?: any }) {
      if (account) {
        token.idToken = account.id_token; // Save the ID token
        token.refreshToken = account.refresh_token;
        token.idTokenExpires = Date.now() + account.expires_in * 1000; // Save the expiration time
      }

      //console.log('inside nextauth, user: ', user);
      //console.log('inside nextauth, user?.otpVerified: ', user?.otpVerified);

      if (user?.otpVerified !== undefined) {
        token.otpVerified = user.otpVerified;
      }
    
      // Set default value if not defined
      token.otpVerified = token.otpVerified ?? false;

      // If ID token is still valid, return it
      if (Date.now() < token.idTokenExpires) {
        //console.log("ID Token still valid:", token.idToken);
        return token;
      }

      // Refresh the ID token if expired
      //console.log("Refreshing ID token...");
      const refreshedToken = await refreshIdToken(token.refreshToken);
      //console.log("New ID Token:", refreshedToken.idToken);

      return {
        ...token,
        idToken: refreshedToken.idToken,
        idTokenExpires: refreshedToken.idTokenExpires,
        refreshToken: refreshedToken.refreshToken,
      };
    },
    async session({ session, token }: { session: any; token: any; account?: any;}) {
      if(token) {
        session.user.id = token.sub; // Use sub from the JWT token
        session.user.idToken = token.idToken; // Pass the ID token to the session
        session.user.refreshToken = token.refreshToken;
        session.user.otpVerified = token.otpVerified ?? false;
        session.error = token.error;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
