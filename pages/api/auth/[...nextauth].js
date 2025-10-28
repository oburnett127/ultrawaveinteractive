// pages/api/auth/[...nextauth].js
const NextAuth = require("next-auth").default;
const { authOptions } = require("../../../lib/authOptions.cjs");

module.exports = function handler(req, res) {
  return NextAuth(req, res, authOptions);
};
