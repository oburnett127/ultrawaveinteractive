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
  
  let sensitiveLimiter;
  let verifyLimiter;
  let updateTokenLimiter;
  let salesbotLimiter;
  let leadsLimiter;
  let blogCreateLimiter;
  let publicLimiter;
  let changePasswordLimiter;
  //let redisHealthLimiter;

  try {
    sensitiveLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "sensitive",
      points: 5,
      duration: 3600,      // 1 hour
      blockDuration: 1800, // 30 min
    });

    verifyLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "verify",
      points: 10,
      duration: 60,        // 1 min
      blockDuration: 300,  // 5 min
    });

    updateTokenLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "update",
      points: 5,
      duration: 600,       // 10 min
      blockDuration: 600,  // 10 min
    });

    salesbotLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "salesbot",
      points: 50,
      duration: 3600,      // 1 hour
      blockDuration: 3600, // 1 hour
    });

    leadsLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "leads",
      points: 10,
      duration: 3600,      // 1 hour
      blockDuration: 900,  // 15 min
    });

    blogCreateLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "blogcreate",
      points: 10,
      duration: 3600,
    });

    publicLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "public",
      points: 100,
      duration: 60,
    });

    // ✅ fixed name: NO "LimiterLimiter"
    changePasswordLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "change-password",
      points: 3,
      duration: 900,      // 15 min
      blockDuration: 1800 // 30 min
    });

    // redisHealthLimiter = limiterFactory({
    //   redisClient: redis,
    //   keyPrefix: "health",
    //   points: 30,
    //   duration: 60,
    //   blockDuration: 300,
    // });

    } catch (err) {
      console.error("[Error ❌]", err);
  }


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
    app.use("/api", waitForRedis, rateLimitMiddleware(otpLimiter), updateTokenRoute);
}

module.exports = { initBackend };
