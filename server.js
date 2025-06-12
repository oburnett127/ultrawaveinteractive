const express = require("express");
const next = require("next");
const dotenv = require("dotenv");
const path = require("path");
const { initBackend } = require('./index.js');
const { logger } = require('./config/logger.js');

// Load environment variables
dotenv.config();

// Determine environment
const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;

// Init Next.js frontend
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

console.log('🔧 Preparing Next.js app');
nextApp.prepare().then(() => {
  console.log('✅ Next.js ready, creating Express app');
  const server = express();

  // 🧠 Your backend entry point (compiled from backend/index.ts)
  console.log('🧠 Initializing backend');
  initBackend(server); // Setup all routes, middleware, etc.

  console.log('🛠️ Setting up Next.js handler');
  // 🛠️ Fallback to Next.js for anything that doesn't match an API route
  server.all("*", (req, res) => {
    return handle(req, res);
  });

  console.log('🚀 Starting server');
  // ✅ Start unified server
  server.listen(port, (err) => {
    if (err) throw err;
    logger.info(`✅ Server ready on http://localhost:${port}`);
  });

  console.log(`✅ Server ready on http://localhost:${port}`);
});
