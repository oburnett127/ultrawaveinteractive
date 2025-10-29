// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import { authOptions } from "../../../lib/authOptions.cjs";

export default function handler(req, res) {
  return NextAuth(req, res, authOptions);
}
