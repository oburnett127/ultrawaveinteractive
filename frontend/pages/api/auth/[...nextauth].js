import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { refreshIdToken } from '../../../utility/auth';

// Define the authOptions with explicit typing
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline", // Request a refresh token
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      //console.log("Sign In Callback Triggered", profile);
      //console.log("Google Profile:", profile);
      
      return true;
    },
    async jwt({ token, account, user }) {
      //console.log('jwt callback running');
      
      //console.log('GOOGLE_CLIENT_ID=',process.env.GOOGLE_CLIENT_ID);
      //console.log('GOOGLE_CLIENT_SECRET=',process.env.GOOGLE_CLIENT_SECRET);
      //console.log('GOOGLE_REFRESH_TOKEN=',process.env.GOOGLE_REFRESH_TOKEN);

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
    async session({ session, token }) {

      //console.log('session callback running');

      //console.log('GOOGLE_CLIENT_ID=',process.env.GOOGLE_CLIENT_ID);
      //console.log('GOOGLE_CLIENT_SECRET=',process.env.GOOGLE_CLIENT_SECRET);
      //console.log('GOOGLE_REFRESH_TOKEN=',process.env.GOOGLE_REFRESH_TOKEN);

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
  debug: true,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Use 'none' only for cross-site cookies in production
        path: "/",
        secure: process.env.NODE_ENV === "production", // Only secure in production with HTTPS
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },  
};

export default NextAuth(authOptions);