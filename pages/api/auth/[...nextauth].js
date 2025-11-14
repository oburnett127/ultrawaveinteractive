// /ultrawaveinteractive/pages/api/auth/[...nextauth].js

const NextAuth = require("next-auth").default;
const { authOptions } = require("../../../lib/authOptions.cjs");

// 1. Get the NextAuth handler function
const authHandler = NextAuth(authOptions);

// 2. Explicitly export the handler.
module.exports = authHandler;

// 3. CRITICAL: Explicitly set the 'default' property on the export
//    to satisfy the Next.js ES-module-aware loader/bundler.
module.exports.default = authHandler;