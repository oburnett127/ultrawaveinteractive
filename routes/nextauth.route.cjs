// routes/nextauth.route.cjs
const express = require("express");
const next = require("next");
const { authOptions } = require("../lib/authOptions.cjs");
const NextAuth = require("next-auth").default;

const router = express.Router();

router.all("*", (req, res) => {
  return NextAuth(req, res, authOptions);
});

module.exports = router;
