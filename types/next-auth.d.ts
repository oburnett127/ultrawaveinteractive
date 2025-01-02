import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Extended Session interface
   * Adds custom properties like idToken, user.id, otpVerified, etc.
   */
  interface Session {
    user: {
      id?: string; // Custom user ID field
      email_verified?: boolean; // Email verification status
      otpVerified?: boolean; // OTP verification status
      accessToken?: string; // Access token for APIs, not a jwt token
      idToken?: string; //jwt token for identifying the user
      email?: string;
    } & DefaultSession["user"]; // Extend the default NextAuth user properties
  }

  /**
   * Extended JWT interface
   * Adds custom properties like id, otpVerified, etc.
   */
  interface JWT {
    id?: string; // User ID in the JWT payload
    email_verified?: boolean; // Email verification status
    otpVerified?: boolean; // OTP verification status
    accessToken?: string; // Access token
  }
}
