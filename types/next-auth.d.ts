import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

// Extend the `User` type
declare module "next-auth" {
  interface User extends DefaultUser {
    email_verified?: boolean;
  }

  interface Session {
    user: {
      email_verified?: boolean;
    } & DefaultSession["user"];
  }
}

// Extend the `JWT` type
declare module "next-auth/jwt" {
  interface JWT {
    email_verified?: boolean;
  }
}
