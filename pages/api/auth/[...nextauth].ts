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
        if (user?.otpVerified) {
          token.otpVerified = true;
        }
        token.otpVerified = token.otpVerified ?? false;
      }
      // If ID token is still valid, return it
      if (Date.now() < token.idTokenExpires) {
        console.log("ID Token still valid:", token.idToken);
        return token;
      }

      // Refresh the ID token if expired
      console.log("Refreshing ID token...");
      const refreshedToken = await refreshIdToken(token.refreshToken);
      console.log("New ID Token:", refreshedToken.idToken);

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
        session.otpVerified = token.otpVerified ?? false;
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

// import NextAuth from "next-auth";
// import GoogleProvider from "next-auth/providers/google";

// export default NextAuth({
//   providers: [
//     GoogleProvider({
//       clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
//       clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || "",
//     }),
//   ],
//   session: {
//     strategy: "jwt", // Use JSON Web Tokens for session handling
//   },
//   callbacks: {
//     async jwt({ token, account, profile }) {
//       // Log to verify this callback is running
//       console.log("JWT Callback - Token: ", token);
//       if (account && profile) {
//         console.log("JWT Callback - Account: ", account);
//         console.log("JWT Callback - Profile: ", profile);
//         // Add email to the token
//         token.email = profile.email;
//       }
//       return token;
//     },
//     async session({ session, token }) {
//       // Log to verify this callback is running
//       console.log("Session Callback - Token: ", token);
//       console.log("Session Callback - Session: ", session);
//       // Add email to the session object
//       session.user.email = token.email;
//       return session;
//     },
//   },
//   cookies: {
//         csrfToken: {
//               name: "next-auth.csrf-token",
//               options: {
//                 httpOnly: true,
//                 secure: process.env.NODE_ENV === "production", // Only secure in production
//                 sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "lax" for local dev
//                 path: "/",
//               },
//             },
//         sessionToken: {
//           name: "next-auth.session-token",
//           options: {
//             httpOnly: true,
//             sameSite: process.env.NODE_ENV === "production" ? "lax" : "none",
//             secure: process.env.NODE_ENV === "production",
//             path: "/", // <-- Also set sessionToken cookie's path to `/`
//             domain: "localhost",
//           },
//         },
//       },
//   debug: process.env.NODE_ENV === "test", // Enable debug logs in development
// });



// import NextAuth from "next-auth";
// import GoogleProvider from "next-auth/providers/google";

// export default NextAuth({
//   providers: [
//     GoogleProvider({
//       clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
//       clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || "",
//     }),
//   ],
//   session: {
//     strategy: "jwt", // Use JSON Web Tokens for session handling
//   },
//   debug: process.env.NODE_ENV !== 'production',
//   callbacks: {
//     async jwt({ token, account, profile }) {
//         // Log to verify this callback is running
//       console.log("JWT Callback - Token: ", token);
//       if (account && profile) {
//         console.log("JWT Callback - Account: ", account);
//         //console.log("JWT Callback - Profileasync jwt({ token, user, trigger }) {
//         // Add email to the token
//         token.email = profile.email;
//         token.idToken = account?.id_token;
//         token.email_verified = (profile as any).email_verified ?? false;
//         token.sub = account?.providerAccountId;
//         token.otpVerified = token.otpVerified ?? false;
//       }
//       return token;
//     },
//     async session({ session, token }) {
//       // Log to verify this callback is running
//       console.log("Session Callback - Token: ", token);
//       console.log("Session Callback - Session: ", session);
//       session.user = {
//         ...session.user,
//         idToken: token.idToken,
//         id: token.sub,
//         email_verified: token.email_verified,
//         otpVerified: token.otpVerified,
//         email: token.email, // Ensure email is set
//         isValid: token.isValid,
//       };
//       return session;
//     },
//   },
//   cookies: {
//     csrfToken: {
//           name: "next-auth.csrf-token",
//           options: {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === "production", // Only secure in production
//             sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "lax" for local dev
//             path: "/",
//           },
//         },
//     sessionToken: {
//       name: "next-auth.session-token",
//       options: {
//         httpOnly: true,
//         sameSite: process.env.NODE_ENV === "production" ? "lax" : "none",
//         secure: process.env.NODE_ENV === "production",
//         path: "/", // <-- Also set sessionToken cookie's path to `/`
//         domain: "localhost",
//       },
//     },
//   },
// });
