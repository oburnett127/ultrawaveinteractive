import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import axios from 'axios';
import qs from 'qs';

async function refreshAccessToken(token: any) {
  try {
    const response = await axios.post(
      "https://oauth2.googleapis.com/token",
      qs.stringify({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
        refresh_token: token.refreshToken,
        grant_type: "refresh_token",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const refreshedTokens = response.data;

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token || token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

// Define the authOptions with explicit typing
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/userinfo.email",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: { token: any; account?: any; user?: any }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = Date.now() + account.expires_in * 1000; // Set expiration time
        token.id = user?.id;

        console.log("Axios Request:", {
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
          refresh_token: account.refresh_token,
          grant_type: "refresh_token",
        });        

        return token;
      }

      // Return previous token if not expired
      if (Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Refresh token if expired
      return refreshAccessToken(token);
    },
    async session({ session, token }: { session: any; token: any; account?: any;}) {
      // Add custom properties to the session object
      session.user.id = token.sub; // Use sub from the JWT token
      session.user.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.includes("/verify-otp")) {
        return url; // Redirect to callbackUrl if provided
      }
      return `${baseUrl}/verify-otp`; // Default fallback
    }
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
