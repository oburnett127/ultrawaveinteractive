// backend/server.cjs
const http = require("http");
const app = require("./app.cjs");
const { disconnectRedisClient } = require("./lib/redisClient.cjs");

const PORT = process.env.PORT || 8080;

let shuttingDown = false;
let activeWebhooks = 0;

// --------------------------------------------------
// HTTP server (Express ONLY — no Next.js)
// --------------------------------------------------
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`✅ Backend API server running on port ${PORT}`);
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