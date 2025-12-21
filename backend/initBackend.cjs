// backend/initBackend.cjs
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const squareWebhookRoute = require("./routes/squareWebhook.route.cjs");
const registerRoute = require("./routes/register.route.cjs");
const paymentRoute = require("./routes/payment.route.cjs");
const contactRoute = require("./routes/contact.route.cjs");
const salesbotRoute = require("./routes/salesbot.route.cjs");
const leadsRoute = require("./routes/leads.route.cjs");
const blogCreateRoute = require("./routes/blogCreate.route.cjs");
const listRoute = require("./routes/list.route.cjs");
const blogRoute = require("./routes/blog.route.cjs");
const changePasswordRoute = require("./routes/changePassword.route.cjs");
const otpRoute = require("./routes/otp.route.cjs");
const updateTokenRoute = require("./routes/updateToken.route.cjs");

async function initBackend(app) {
  // -------------------------------------------------
    // ❤️ Health check (liveness)
    // -------------------------------------------------
    app.get("/health", (req, res) => {
      res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: Date.now(),
      });
    });
  
    // -------------------------------------------------
    // 🟢 Readiness check
    // -------------------------------------------------
    app.get("/ready", (req, res) => {
      if (global.__SHUTTING_DOWN__) {
        return res.status(503).json({ status: "shutting_down" });
      }
      res.status(200).json({ status: "ready" });
    });
  
    // -------------------------------------------------
    // 🔔 Square webhook (RAW body only)
    // -------------------------------------------------
    const squareWebhookRoute = require("./routes/squareWebhook.route.cjs");
    
    // -------------------------------------------------
    // 📦 Body parsers — API ONLY
    // -------------------------------------------------
    app.use("/api", bodyParser.json({ limit: "1mb" }));
    app.use("/api", bodyParser.urlencoded({ extended: true, limit: "1mb" }));
  
    const waitForRedis = (req, res, next) => {
      if (!redis) {
        return res
          .status(503)
          .json({ error: "Service initializing, try again shortly." });
      }
      next();
    };
  
    const rateLimitMiddleware = (limiter) =>
      isProd
        ? async (req, res, next) => {
            try {
              await limiter.consume(req.realIp);
              next();
            } catch {
              res.status(429).json({ error: "Too many requests" });
            }
          }
        : (req, res, next) => next();
  
    // -------------------------------------------------
    // 🚏 Routes
    // -------------------------------------------------
    app.use("/api", waitForRedis, registerRoute);
    app.use("/api", waitForRedis, paymentRoute);
    app.use("/api", waitForRedis, contactRoute);
    app.use("/api", waitForRedis, salesbotRoute);
    app.use("/api", waitForRedis, leadsRoute);
    app.use("/api", waitForRedis, blogCreateRoute);
    app.use("/api", waitForRedis, listRoute);
    app.use("/api", waitForRedis, changePasswordRoute);
    app.use("/api/otp", waitForRedis, otpRoute);
    app.use("/api", waitForRedis, blogRoute);
    app.use("/api", waitForRedis, updateTokenRoute);
}

module.exports = { initBackend };
