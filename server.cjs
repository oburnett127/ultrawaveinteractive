const express = require("express");
const next = require("next");
const dotenv = require("dotenv");
const { disconnectRedisClient } = require("./lib/redisClient.cjs");
const prisma = require("./lib/prisma.cjs");

dotenv.config();

const { initBackend } = require("./index.cjs");
const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 4000;

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

    // ✅ IMPORTANT: Wait for Express backend routes to mount
    await initBackend(server, handle);

    server.listen(port, (err) => {
      if (err) throw err;
      console.log(`✅ Server ready on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("💥 Server startup error:", err);
  }
})();

async function handleShutdown(signal) {
  console.warn(`\n[Server] Received ${signal}. Shutting down gracefully...`);

  try {
    // Close Redis
    await disconnectRedisClient();

    // Close Prisma connection
    await prisma.$disconnect();
    console.log("[Prisma ✅] Disconnected cleanly");
  } catch (err) {
    console.error("[Shutdown ❌] Error during cleanup:", err.message);
  }

  process.exit(0);
}

// Handle common exit signals (e.g., CTRL+C, Docker shutdown)
["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => handleShutdown(signal));
});
