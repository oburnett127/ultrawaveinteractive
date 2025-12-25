import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/authOptions.cjs";

const handler = NextAuth(authOptions);

// ✅ REQUIRED for App Router
export { handler as GET, handler as POST };
