import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string; // Add the 'id' field here
      email_verified?: boolean; // Add 'email_verified'
      otpVerified?: boolean; // Add 'otpVerified'
    } & DefaultSession["user"]; // Inherit default properties like name, email, image
  }

  interface JWT {
    id?: string; // Add the 'id' field here for JWT
    email_verified?: boolean; // Add 'email_verified'
    otpVerified?: boolean; // Add 'otpVerified'
  }
}
