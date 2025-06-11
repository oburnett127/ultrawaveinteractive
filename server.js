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

nextApp.prepare().then(() => {
  const server = express();

  // 🧠 Your backend entry point (compiled from backend/index.ts)
  
  initBackend(server); // Setup all routes, middleware, etc.

  // 🛠️ Fallback to Next.js for anything that doesn't match an API route
  server.all("*", (req, res) => {
    return handle(req, res);
  });

  // ✅ Start unified server
  server.listen(port, (err) => {
    if (err) throw err;
    logger.info(`✅ Server ready on http://localhost:${port}`);
  });

  console.log(`✅ Server ready on http://localhost:${port}`);
});
