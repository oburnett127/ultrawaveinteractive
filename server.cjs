const express = require("express");
const next = require("next");
const dotenv = require("dotenv");

dotenv.config();

const { initBackend } = require("./index.cjs");
const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;

const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

(async () => {
  try {
    await nextApp.prepare();
    const server = express();

    const ONE_YEAR = 31536000;
    server.use(
      "/images",
      express.static("public/images", {
        setHeaders: (res, path) => {
          res.setHeader(
            "Cache-Control",
            `public, max-age=${ONE_YEAR}, immutable`
          );
        },
      })
    );

    server.set("trust proxy", 1);

    // ✅ NextAuth handled first by Next.js
    server.all("/api/auth/*", (req, res) => handle(req, res));

    // ✅ IMPORTANT: Wait for Express backend routes to mount
    await initBackend(server);

    // ✅ Only after backend routes are ready, let Next.js handle everything else
    server.all("*", (req, res) => handle(req, res));

    server.listen(port, (err) => {
      if (err) throw err;
      console.log(`✅ Server ready on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("💥 Server startup error:", err);
  }
})();
