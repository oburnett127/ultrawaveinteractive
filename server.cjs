// server.cjs
const express = require("express");
const next = require("next");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const path = require("path");

const { disconnectRedisClient } = require("./backend/lib/redisClient.cjs");

dotenv.config();

// 🔁 Global shutdown state (USED BY WEBHOOK ROUTES)
global.__SHUTTING_DOWN__ = false;
global.__ACTIVE_WEBHOOKS__ = 0;

let isShuttingDown = false;

// ✅ IMPORTANT: backend initializer MUST come from backend
const { initBackend } = require("./backend/initBackend.cjs");

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;

// ✅ Tell Next.js where the frontend lives
const nextApp = next({
  dev,
  dir: path.join(__dirname, "frontend"),
});

const handle = nextApp.getRequestHandler();

(async () => {
  try {
    await nextApp.prepare();

    const server = express();

    // --------------------------------------------------
    // 🔐 CSP NONCE (must run before Next.js rendering)
    // --------------------------------------------------
    server.use((req, res, nextFn) => {
      const nonce = crypto.randomUUID();
      res.locals.cspNonce = nonce;
      res.setHeader("x-csp-nonce", nonce);
      nextFn();
    });

    // --------------------------------------------------
    // 🍪 Cookies (safe globally)
    // --------------------------------------------------
    server.use(cookieParser());

    // --------------------------------------------------
    // 🔥 Square webhooks REQUIRE raw body
    // MUST come BEFORE express.json()
    // --------------------------------------------------
    server.use(
      "/api/square/webhook",
      express.raw({ type: "*/*" })
    );

    // --------------------------------------------------
    // 🧠 Normal JSON parsing for all other routes
    // --------------------------------------------------
    server.use(express.json());

    // --------------------------------------------------
    // 🔐 Let Next.js fully own NextAuth
    // --------------------------------------------------
    server.all("/api/auth/:path*", (req, res) => {
      return handle(req, res);
    });

    // --------------------------------------------------
    // 🧠 Mount backend routes (APIs, webhooks, etc.)
    // --------------------------------------------------
    await initBackend(server);

    // --------------------------------------------------
    // 🌐 Let Next.js handle everything else
    // --------------------------------------------------
    server.all("*", (req, res) => {
      return handle(req, res);
    });

    // --------------------------------------------------
    // 🚀 Start server
    // --------------------------------------------------
    const httpServer = server.listen(port, () => {
      console.log(`🚀 Unified dev server ready at http://localhost:${port}`);
    });

    // Expose for shutdown logic
    global.httpServer = httpServer;

  } catch (err) {
    console.error("❌ Server startup error:", err);
    process.exit(1);
  }
})();

// --------------------------------------------------
// 🛑 Graceful, idempotent shutdown
// --------------------------------------------------
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 ${signal} received — graceful shutdown starting...`);

  // Block new webhooks
  global.__SHUTTING_DOWN__ = true;

  // 1️⃣ Stop accepting new HTTP connections
  if (global.httpServer) {
    global.httpServer.close(() => {
      console.log("🧹 HTTP server closed");
    });
  }

  // 2️⃣ Wait for in-flight Square webhooks
  const timeoutMs = 15_000;
  const start = Date.now();

  while (global.__ACTIVE_WEBHOOKS__ > 0) {
    if (Date.now() - start > timeoutMs) {
      console.warn("⏱ Webhook shutdown timeout reached");
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  // 3️⃣ Disconnect Redis
  try {
    await disconnectRedisClient();
  } catch (err) {
    console.error("[Redis shutdown error]", err);
  }

  console.log("✅ Shutdown complete");
  process.exit(0);
}

// --------------------------------------------------
// 📡 Shutdown signals
// --------------------------------------------------
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
  shutdown("unhandledRejection");
});