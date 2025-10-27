// ✅ This is correct for NextAuth v4 + CJS authOptions

import NextAuth from "next-auth";
import { authOptions } from "../../../lib/authOptions.cjs"; // named import from CJS

export default function handler(req, res) {
  return NextAuth(req, res, authOptions);
}