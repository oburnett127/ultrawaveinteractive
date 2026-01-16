// backend/app.cjs
const express = require("express");
const bodyParser = require("body-parser");

const {
  createRedisClient,
  limiterFactory,
} = require("./lib/redisClient.cjs");

// Routes
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

const app = express();
const isProd = process.env.NODE_ENV === "production";

// --------------------------------------------------
// Trust proxy (Cloudflare / Northflank)
// --------------------------------------------------
app.set("trust proxy", true);

// --------------------------------------------------
// Early middleware
// --------------------------------------------------
require("./lib/cloudflareNormalize.cjs")(app);
require("./lib/cookies.cjs")(app);
require("./lib/cspNonce.cjs")(app);
require("./lib/csp.cjs")(app);

// --------------------------------------------------
// Redis (shared, async init)
// --------------------------------------------------
let redis;

(async () => {
  try {
    redis = await createRedisClient();
    console.log("✅ Redis connected");
  } catch (err) {
    console.error("❌ Redis connection failed:", err);
  }
})();

let limiters;

function getLimiters() {
  if (!redis || !redis.isOpen) {
    throw new Error("Redis not ready for limiters");
  }

  if (!limiters) {
    limiters = {
      register: limiterFactory({
        redisClient: redis,
        keyPrefix: "register",
        points: 5,
        duration: 3600,
        blockDuration: 1800,
      }),
      otp: limiterFactory({
        redisClient: redis,
        keyPrefix: "otp",
        points: 5,
        duration: 300,
        blockDuration: 900,
      }),
      updateToken: limiterFactory({
        redisClient: redis,
        keyPrefix: "update-token",
        points: 5,
        duration: 600,
      }),
      salesbot: limiterFactory({
        redisClient: redis,
        keyPrefix: "salesbot",
        points: 50,
        duration: 3600,
      }),
      leads: limiterFactory({
        redisClient: redis,
        keyPrefix: "leads",
        points: 10,
        duration: 3600,
      }),
      blogCreate: limiterFactory({
        redisClient: redis,
        keyPrefix: "blog-create",
        points: 10,
        duration: 3600,
      }),
      changePassword: limiterFactory({
        redisClient: redis,
        keyPrefix: "change-password",
        points: 3,
        duration: 900,
        blockDuration: 1800,
      }),
    };
  }

  return limiters;
}

// --------------------------------------------------
// Health & readiness
// --------------------------------------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/ready", (req, res) => {
  if (global.__SHUTTING_DOWN__) {
    return res.status(503).json({ status: "shutting_down" });
  }
  if (!redis || !redis.isOpen) {
    return res.status(503).json({ status: "redis_not_ready" });
  }
  res.status(200).json({ status: "ready" });
});

// --------------------------------------------------
// Square webhook — RAW BODY ONLY
// --------------------------------------------------
app.use(
  "/api/square/webhook",
  bodyParser.raw({ type: "*/*" }),
  squareWebhookRoute
);

// --------------------------------------------------
// JSON parsing (API only)
// --------------------------------------------------
app.use("/api", bodyParser.json({ limit: "1mb" }));
app.use("/api", bodyParser.urlencoded({ extended: true, limit: "1mb" }));

// --------------------------------------------------
// Redis readiness gate
// --------------------------------------------------
const waitForRedis = (req, res, next) => {
  if (!redis || !redis.isOpen) {
    return res.status(503).json({ error: "Redis not ready" });
  }
  next();
};

// --------------------------------------------------
// Rate limiting helpers
// --------------------------------------------------
const rateLimit = (limiterName) =>
  !isProd
    ? (req, res, next) => next()
    : async (req, res, next) => {
        try {
          const limiter = getLimiters()[limiterName];
          await limiter.consume(req.realIp || req.ip);
          next();
        } catch {
          res.status(429).json({ error: "Too many requests" });
        }
      };

// --------------------------------------------------
// 🚏 Routes (scoped + safe)
// --------------------------------------------------
app.use("/api", waitForRedis, rateLimit("register"), registerRoute);
app.use("/api", waitForRedis, paymentRoute);
app.use("/api", waitForRedis, contactRoute);
app.use("/api", waitForRedis, rateLimit("salesbot"), salesbotRoute);
app.use("/api", waitForRedis, rateLimit("leads"), leadsRoute);
app.use("/api", waitForRedis, rateLimit("blogCreate"), blogCreateRoute);
app.use("/api", waitForRedis, listRoute);
app.use("/api", waitForRedis, rateLimit("changePassword"), changePasswordRoute);
app.use("/api/otp", waitForRedis, rateLimit("otp"), otpRoute);
app.use("/api", waitForRedis, blogRoute);
app.use("/api", waitForRedis, rateLimit("updateToken"), updateTokenRoute);

module.exports = app;
