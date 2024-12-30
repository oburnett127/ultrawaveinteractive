import NextAuth from "next-auth";

declare module "next-auth" {
  export interface Session {
    user: {
      id?: string; // Add the 'id' field here
      email_verified?: boolean; // Add 'email_verified'
      otpVerified?: boolean; // Add 'otpVerified'
      accessToken?: string;
    } & DefaultSession["user"]; // Inherit default properties like name, email, image
  }

  interface JWT {
    id?: string; // Add the 'id' field here for JWT
    email_verified?: boolean; // Add 'email_verified'
    otpVerified?: boolean; // Add 'otpVerified'
    accessToken?: string;
  }
}
