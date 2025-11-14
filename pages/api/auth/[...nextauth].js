// /ultrawaveinteractive/pages/api/auth/[...nextauth].js
// This API Route requires a default export, which NextAuth provides when called.
// Use the NextAuth function as the default export.

const NextAuth = require("next-auth").default;
const { authOptions } = require("../../../lib/authOptions.cjs");

// Export the NextAuth handler function as the default export.
// This is the common, official pattern for NextAuth in the Pages Router.
module.exports = NextAuth(authOptions);