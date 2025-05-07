const express = require("express");
const next = require("next");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config();

// Determine environment
const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 5000;

// Init Next.js frontend
const nextApp = next({ dev, dir: "./frontend" });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const server = express();

  // 🧠 Your backend entry point (compiled from backend/index.ts)
  const initBackend = require("./backend/dist/index.js").default;
  initBackend(server); // Setup all routes, middleware, etc.

  // 🛠️ Fallback to Next.js for anything that doesn't match an API route
  server.all("*", (req, res) => {
    return handle(req, res);
  });

  // ✅ Start unified server
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`✅ Server ready on http://localhost:${port}`);
  });
});
