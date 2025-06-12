console.log("🧪 ENV snapshot:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  // Add others you expect
});


// console.log("📦 server.js loaded");

// process.on('unhandledRejection', (reason, promise) => {
//   console.error('🚨 Unhandled Rejection:', reason);
// });

// process.on('uncaughtException', (err) => {
//   console.error('🚨 Uncaught Exception:', err);
// });

// const express = require("express");
// const next = require("next");
// const dotenv = require("dotenv");
// const path = require("path");

// console.log("🧪 Loading .env");
// dotenv.config();

// const { initBackend } = require('./index.js');
// const { logger } = require('./config/logger.js');

// const dev = process.env.NODE_ENV !== "production";
// const port = process.env.PORT || 3000;

// console.log("🧪 Preparing Next.js app");
// const nextApp = next({ dev });
// const handle = nextApp.getRequestHandler();

// nextApp.prepare()
//   .then(() => {
//     console.log("✅ Next.js ready");

//     const server = express();

//     console.log("🧪 Running initBackend");
//     initBackend(server);

//     server.get("/", (req, res) => {
//       res.send("Hello from Ultrawave!");
//     });

//     server.all("*", (req, res) => handle(req, res));

//     console.log("🚀 Starting unified server");

//     server.listen(port, (err) => {
//       if (err) {
//         console.error("💥 Listen failed:", err);
//         throw err;
//       }
//       console.log(`✅ Server ready on http://localhost:${port}`);
//     });
//   })
//   .catch((err) => {
//     console.error("💥 nextApp.prepare() failed:", err);
//   });

//   console.log("🧪 Reached bottom of file");
