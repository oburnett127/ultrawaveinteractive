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
    // async redirect({ url, baseUrl }) {
    //   // Always redirect to /verify-otp after login
    //   return `${baseUrl}/verify-otp`;
    // },
  },
  cookies: {
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "lax" : "none", // Use "none" for cross-origin requests
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production
        path: "/", // <-- Set the cookie's path to `/` so it's sent to all endpoints
        domain: "localhost",
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

// import NextAuth, { NextAuthOptions } from "next-auth";
// import GoogleProvider from "next-auth/providers/google";

// export const authOptions: NextAuthOptions = {
//   providers: [
//     GoogleProvider({
//       clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
//       clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || "",
//       authorization: {
//         params: {
//           scope: "openid email profile", // Include email_verified
//         },
//       },
//     }),
//   ],
//   debug: process.env.NODE_ENV !== "production", // Enable debug logs only in development
//   session: {
//     strategy: "jwt",
//   },
//   callbacks: {
//     async jwt({ token, account, profile }) {
//       if (account && profile) {
//         token.idToken = account.id_token;
//         token.email_verified = (profile as any).email_verified ?? false; // Add `email_verified`
//         token.sub = account.providerAccountId; // Store the user's unique ID
//         token.email = profile.email; // Store the email
//         token.otpVerified = token.otpVerified ?? false; // Default OTP verification to false
//       }
//       return token;
//     },
//     async session({ session, token }) {
//       // Add custom fields to the session object
//       session.user = {
//         ...session.user,
//         idToken: token.idToken,
//         id: token.sub, // Add the user's unique ID
//         email_verified: token.email_verified, // Add `email_verified`
//         otpVerified: token.otpVerified, // Add `otpVerified`
//       };
//       return session;
//     },
//     // async redirect({ url, baseUrl }) {
//     //   // Always redirect to /verify-otp after login
//     //   return `${baseUrl}/verify-otp`;
//     // },
//   },
//   cookies: {
//     csrfToken: {
//       name: "next-auth.csrf-token",
//       options: {
//         httpOnly: true,
//         sameSite: process.env.NODE_ENV === "production" ? "lax" : "none", // Use lax in production
//         secure: process.env.NODE_ENV === "production",
//         path: "/", // <-- Set the cookie's path to `/` so it's sent to all endpoints
//       },
//     },
//     sessionToken: {
//       name: "next-auth.session-token",
//       options: {
//         httpOnly: true,
//         sameSite: process.env.NODE_ENV === "production" ? "lax" : "none", // Use lax in production if no cross-origin
//         secure: process.env.NODE_ENV === "production", // Use secure cookies in production
//         path: "/",
//       },
//     },
//   },
// };

// export default NextAuth(authOptions);


// import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
// import GoogleProvider from "next-auth/providers/google";

// // Extend the `User`, `Session`, and `JWT` types to include custom fields
// declare module "next-auth" {
//   interface User {
//     email_verified?: boolean;
//   }

//   interface Session {
//     user: {
//       id?: string; // Add the 'id' field
//       email_verified?: boolean;
//       otpVerified?: boolean;
//     } & DefaultSession["user"];
//   }
// }

// declare module "next-auth/jwt" {
//   interface JWT {
//     email_verified?: boolean;
//   }
// }

// //GOOGLE_CLIENT_ID is same as GMAIL_CLIENT_ID
// export const authOptions: NextAuthOptions = {
//   providers: [
//     GoogleProvider({
//       clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "clientid-not-present",
//       clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || "client-secret-not-present",
//     }),
//   ],
//   debug: true,
//   session: {
//     strategy: "jwt", // Using JSON Web Tokens for session handling
//   },
//   callbacks: {
//     async jwt({ token, account, profile }) {
//       // Add custom fields to the token
//       if (account && profile) {
//         token.email_verified = (profile as any).email_verified ?? false;
//         token.sub = account.providerAccountId; // Map user's ID to `sub`
//         token.email = profile.email;
//         token.otpVerified = false;
//       }
//       return token;
//     },

//     async session({ session, token }) {
//       // Add custom fields to the session
//       session.user = {
//         ...session.user,
//         id: token.sub, // Map the user's ID from the token
//         email_verified: token.email_verified, // Map `email_verified` to the session
//         otpVerified: token.otpVerified,
//       };
//       session.user.email = token.email;
//       session.user.otpVerified = token.otpVerified || false;
//       return session;
//     },

//     async redirect({ url, baseUrl }) {
//       return `${baseUrl}/verify-otp`; // Ensure the redirect is correct
//     },
//   },

//   // Ensure cookies are set with proper SameSite policy for cross-origin compatibility
//   cookies: {
//     sessionToken: {
//       name: `next-auth.session-token`,
//       options: {
//         httpOnly: true,
//         sameSite: "none", // Allow cross-origin requests
//         secure: process.env.NODE_ENV === "production", // Use secure cookies in production
//       },
//     },
//     csrfToken: {
//       name: `next-auth.csrf-token`,
//       options: {
//         httpOnly: true,
//         sameSite: "none", // Allow cross-origin requests
//         secure: process.env.NODE_ENV === "production", // Use secure cookies in production
//       },
//     },
//   },
// };

// export default NextAuth(authOptions);
