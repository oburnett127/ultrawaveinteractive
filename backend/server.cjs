const http = require("http");
const next = require("next");
const app = require("./app.cjs");
const redis = require("./lib/redis.cjs");
const { disconnectRedisClient } = require("./lib/redisClient.cjs");

const PORT = process.env.PORT || 8080;
const dev = process.env.NODE_ENV !== "production";

let shuttingDown = false;
let activeWebhooks = 0;

// --------------------------------------------------
// Next.js setup (unified server)
// --------------------------------------------------
const nextApp = next({ dev, dir: "../frontend" });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  // Let Next.js own everything else
  app.all("*", (req, res) => handle(req, res));

  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`✅ Unified server running on port ${PORT}`);
  });

  // --------------------------------------------------
  // Graceful shutdown
  // --------------------------------------------------
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`🛑 ${signal} received. Draining connections...`);

    server.close(async () => {
      try {
        console.log("⏳ Waiting for in-flight Square webhooks...");
        while (activeWebhooks > 0) {
          await new Promise((r) => setTimeout(r, 100));
        }

        // Disconnect Redis
        try {
          await disconnectRedisClient();
        } catch (err) {
          console.error("[Redis shutdown error]", err);
        }

        console.log("✅ Shutdown complete");
        process.exit(0);
      } catch (err) {
        console.error("❌ Shutdown error", err);
        process.exit(1);
      }
    });
   
    setTimeout(() => {
      console.error("⏰ Forced shutdown");
      process.exit(1);
    }, 20_000);
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  process.on("uncaughtException", shutdown);
  process.on("unhandledRejection", shutdown);
});
