// backend/initBackend.cjs
const bodyParser = require("body-parser");
const { createRedisClient, limiterFactory } = require("./lib/redisClient.cjs");
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

const isProd = process.env.NODE_ENV === "production";

async function initBackend(app) {

  const redis = await createRedisClient();
  // -------------------------------------------------
  // ❤️ Health
  // -------------------------------------------------
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  });

  app.get("/ready", (req, res) => {
    if (global.__SHUTTING_DOWN__) {
      return res.status(503).json({ status: "shutting_down" });
    }
    res.status(200).json({ status: "ready" });
  });

  // -------------------------------------------------
  // 🔔 Square webhook (RAW ONLY)
  // -------------------------------------------------
  app.use(
    "/api/square/webhook",
    bodyParser.raw({ type: "*/*" }),
    squareWebhookRoute
  );

  // -------------------------------------------------
  // 📦 JSON parsing (API only)
  // -------------------------------------------------
  app.use("/api", bodyParser.json({ limit: "1mb" }));
  app.use("/api", bodyParser.urlencoded({ extended: true, limit: "1mb" }));

  const waitForRedis = (req, res, next) => {
    if (!redis || !redis.isOpen) {
      return res.status(503).json({ error: "Redis not ready" });
    }
    next();
  };

  const rateLimitMiddleware = (limiter) =>
    !isProd
      ? (req, res, next) => next()
      : async (req, res, next) => {
          try {
            await limiter.consume(req.realIp || req.ip);
            next();
          } catch {
            res.status(429).json({ error: "Too many requests" });
          }
        };

  // -------------------------------------------------
  // 🚦 Limiters
  // -------------------------------------------------
  const registerLimiter = limiterFactory({
    redisClient: redis,
    keyPrefix: "register",
    points: 5,
    duration: 3600,
    blockDuration: 1800,
  });

  const otpLimiter = limiterFactory({
    redisClient: redis,
    keyPrefix: "otp",
    points: 5,
    duration: 300,
    blockDuration: 900,
  });

  const updateTokenLimiter = limiterFactory({
    redisClient: redis,
    keyPrefix: "update-token",
    points: 5,
    duration: 600,
  });

  const salesbotLimiter = limiterFactory({
    redisClient: redis,
    keyPrefix: "salesbot",
    points: 50,
    duration: 3600,
  });

  const leadsLimiter = limiterFactory({
    redisClient: redis,
    keyPrefix: "leads",
    points: 10,
    duration: 3600,
  });

  const blogCreateLimiter = limiterFactory({
    redisClient: redis,
    keyPrefix: "blog-create",
    points: 10,
    duration: 3600,
  });

  const changePasswordLimiter = limiterFactory({
    redisClient: redis,
    keyPrefix: "change-password",
    points: 3,
    duration: 900,
    blockDuration: 1800,
  });

  // -------------------------------------------------
  // 🚏 Routes (scoped + safe)
  // -------------------------------------------------
  app.use("/api", waitForRedis, rateLimitMiddleware(registerLimiter), registerRoute);
  app.use("/api", waitForRedis, paymentRoute);
  app.use("/api", waitForRedis, contactRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(salesbotLimiter), salesbotRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(leadsLimiter), leadsRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(blogCreateLimiter), blogCreateRoute);
  app.use("/api", waitForRedis, listRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(changePasswordLimiter), changePasswordRoute);
  app.use("/api/otp", waitForRedis, rateLimitMiddleware(otpLimiter), otpRoute);
  app.use("/api", waitForRedis, blogRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(updateTokenLimiter), updateTokenRoute);
}

module.exports = { initBackend };