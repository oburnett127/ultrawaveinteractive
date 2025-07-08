const express = require("express");
const next = require("next");
const dotenv = require("dotenv");

dotenv.config();

const { initBackend } = require('./index.js');
const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;

const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare()
  .then(() => {
    const server = express();

    server.set("trust proxy", 1);

    // ✅ Let NextAuth handle its own routes *first*
    server.all("/api/auth/*", (req, res) => handle(req, res));

    // ✅ Prevent backend init from touching NextAuth routes
    server.use((req, res, next) => {
      if (req.url.startsWith("/api/auth")) return next();
      initBackend(server);
      next();
    });

    // All other routes handled by Next.js
    server.all("*", (req, res) => handle(req, res));

    server.listen(port, (err) => {
      if (err) throw err;
      console.log(`✅ Server ready on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("💥 nextApp.prepare() failed:", err);
  });
