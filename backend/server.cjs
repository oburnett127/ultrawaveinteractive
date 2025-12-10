// server.cjs
const express = require("express");
const next = require("next");
const dotenv = require("dotenv");

dotenv.config();

// Load initBackend exported from index.cjs
const { initBackend } = require("../frontend/index.cjs");

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;

// Create Next.js app
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

(async () => {
  try {
    // Prepare Next.js
    await nextApp.prepare();

    // Create Express server
    const server = express();

    // server.use((req, res, next) => {
    //   console.log("REQ:", req.method, req.url);
    //   next();
    // });

    // ---------------------------
    // 🔥 VERY IMPORTANT
    // This MUST be before ANY backend routes.
    // Forward ALL NextAuth requests to Next.js
    // while preserving the FULL path.
    // ---------------------------
    // server.all("/api/auth/:nextauth*", (req, res) => {
    //   //console.log("🔥 Forwarding FULL NextAuth request:", req.method, req.url);
    //   return handle(req, res);
    // });

    // 🔥 Ensure ALL NextAuth requests bypass backend middleware entirely
   
 // --------------------------------------------------
// ABSOLUTE RULE:
// LET NEXTAUTH HANDLE EVERYTHING UNDER /api/auth
// --------------------------------------------------
server.all("/api/auth*", (req, res) => {
  return handle(req, res);
});
server.all("/api/auth/*", (req, res) => {
  return handle(req, res);
});
server.all("/api/auth", (req, res) => {
  return handle(req, res);
});

server.all("/session", (req, res) => handle(req, res));
server.all("/session*", (req, res) => handle(req, res));


    const cookieParser = require("cookie-parser");
    server.use(cookieParser());

    // ---------------------------
    // Mount your backend routes
    // ---------------------------
    await initBackend(server, handle);

    // Ensure Next handles all NextAuth routes
    // server.all("/api/auth/*", (req, res) => {
    //   return handle(req, res);
    // });

    // ---------------------------
    // Let Next.js handle everything else
    // ---------------------------
    server.all("*", (req, res) => {
      return handle(req, res);
    });

    // ---------------------------
    // Start server
    // ---------------------------
    server.listen(port, (err) => {
      if (err) throw err;
      console.log(`🚀 Server ready at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ Server startup error:", err);
  }
})();


// const express = require("express");
// const next = require("next");
// const dotenv = require("dotenv");
// const { disconnectRedisClient } = require("./lib/redisClient.cjs");
// const prisma = require("./lib/prisma.cjs");

// dotenv.config();

// const { initBackend } = require("./index.cjs");
// const dev = process.env.NODE_ENV !== "production";
// const port = process.env.PORT || 4000;

// const nextApp = next({ dev });
// const handle = nextApp.getRequestHandler();

// (async () => {
//   try {
//     await nextApp.prepare();
//     const server = express();

//     const ONE_YEAR = 31536000;
//     server.use(
//       "/images",
//       express.static("public/images", {
//         setHeaders: (res, path) => {
//           res.setHeader(
//             "Cache-Control",
//             `public, max-age=${ONE_YEAR}, immutable`
//           );
//         },
//       })
//     );

//     server.set("trust proxy", 1);

//     // ✅ IMPORTANT: Wait for Express backend routes to mount
//     await initBackend(server, handle);

//     server.listen(port, (err) => {
//       if (err) throw err;
//       console.log(`✅ Server ready on http://localhost:${port}`);
//     });
//   } catch (err) {
//     console.error("💥 Server startup error:", err);
//   }
// })();

// async function handleShutdown(signal) {
//   console.warn(`\n[Server] Received ${signal}. Shutting down gracefully...`);

//   try {
//     // Close Redis
//     await disconnectRedisClient();

//     // Close Prisma connection
//     await prisma.$disconnect();
//     console.log("[Prisma ✅] Disconnected cleanly");
//   } catch (err) {
//     console.error("[Shutdown ❌] Error during cleanup:", err.message);
//   }

//   process.exit(0);
// }

// // Handle common exit signals (e.g., CTRL+C, Docker shutdown)
// ["SIGINT", "SIGTERM"].forEach((signal) => {
//   process.on(signal, () => handleShutdown(signal));
// });
