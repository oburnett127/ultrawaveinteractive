// index.cjs
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const sanitizeHtml = require("sanitize-html");
const { createRedisClient, limiterFactory, disconnectRedisClient } = require("./lib/redisClient.cjs");

const salesbotRoute = require("./routes/salesbot.route.cjs");
const registerRoute = require("./routes/register.route.cjs");
const paymentRoute = require("./routes/payment.route.cjs");
const contactRoute = require("./routes/contact.route.cjs");
const sendOtpRoute = require("./routes/send.route.cjs");
const verifyOtpRoute = require("./routes/verify.route.cjs");
const updateTokenRoute = require("./routes/updateToken.route.cjs");
const squareWebhookRoute = require("./routes/squareWebhook.route.cjs");
const leadsRoute = require("./routes/leads.route.cjs");
const blogCreateRoute = require("./routes/blogCreate.route.cjs");
const listRoute = require("./routes/list.route.cjs");
const blogRoute = require("./routes/blog.route.cjs");
const changePasswordRoute = require("./routes/changePassword.route.cjs");
const healthRoute = require("./routes/health.route.cjs");

function boolFromEnv(v, def = false) {
  if (v === undefined) return def;
  return /^(1|true|yes|on)$/i.test(String(v));
}

function makeSanitizer(options = {}) {
  return function sanitizeBody(req, _res, next) {
    if (req.body && typeof req.body === "object") {
      for (const [k, v] of Object.entries(req.body)) {
        if (typeof v === "string") {
          req.body[k] = sanitizeHtml(v, { allowedTags: [], allowedAttributes: {}, ...options }).trim();
        }
      }
    }
    next();
  };
}

async function initBackend(app) {
  dotenv.config();
  const isProd = process.env.NODE_ENV === "production";

  // Trust proxy for correct IP handling behind Cloudflare, etc.
  app.set("trust proxy", 1);

  // CSP Nonce setup (used by Helmet)
  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
    globalThis.__CSP_NONCE__ = res.locals.cspNonce;
    next();
  });

  // Helmet dynamic CSP setup
  // 3) Helmet setup (dynamic import)
  const helmet = (await import("helmet")).default;

  app.use((req, res, next) => {
    const nonce = res.locals.cspNonce;
    const isProd = process.env.NODE_ENV === "production";

    const directives = {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
      "img-src": ["'self'", "data:", "https://*"],
      "object-src": ["'none'"],
      "script-src": [
        "'self'",
        `'nonce-${nonce}'`,
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://sandbox.web.squarecdn.com",
        "https://cdn.jsdelivr.net",
        ...(isProd ? [] : ["'unsafe-eval'", "http://localhost:3000"]),
      ],
      "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com",
      ],
      "connect-src": ["'self'", "https://*", ...(isProd ? [] : ["ws://localhost:3000"])],
      "frame-src": ["'self'", "https://www.google.com", "https://*.squareup.com"],
    };

    return helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives,
      },
      referrerPolicy: { policy: "no-referrer-when-downgrade" },
      frameguard: { action: "deny" },
      noSniff: true,
      permittedCrossDomainPolicies: true,
    })(req, res, next);
  });

  // CORS config
  const enableCors = boolFromEnv(process.env.ENABLE_CORS, true);
  if (enableCors) {
    app.use(
      cors({
        origin: ["http://localhost:3000", "https://ultrawaveinteractive.com"],
        methods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        maxAge: 86400,
      })
    );
  }

  // Allow pre-flight OPTIONS
  app.use((req, res, next) => {
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // Square webhook MUST use raw body
  app.use("/api/square/webhook", express.raw({ type: "application/json" }));

  // Standard body parsers
  app.use(bodyParser.json({ limit: "1mb" }));
  app.use(bodyParser.urlencoded({ extended: true, limit: "1mb" }));

  // Initialize Redis + Rate Limiters
  let redis;
  let sensitiveLimiter, verifyLimiter, updateTokenLimiter, salesbotLimiter, leadsLimiter, blogCreateLimiter, publicLimiter, changePasswordLimiter, redisHealthLimiter;
  (async () => {
    try {
      redis = await createRedisClient();
      console.log("🔍 REDIS_URL:", process.env.REDIS_URL);

      sensitiveLimiter = limiterFactory({
        redisClient: redis,
        keyPrefix: "sensitive",
        points: 5,
        duration: 3600,      // 1 hour
        blockDuration: 1800  // Block for 30 min after 5 tries
      });

      verifyLimiter = limiterFactory({
        redisClient: redis,
        keyPrefix: "verify",
        points: 10,
        duration: 60,        // 1 min
        blockDuration: 300   // Block for 5 min
      });

      updateTokenLimiter = limiterFactory({
        redisClient: redis,
        keyPrefix: "update",
        points: 5,
        duration: 600,       // 10 min
        blockDuration: 600   // Block for 10 min
      });

      salesbotLimiter = limiterFactory({
        redisClient: redis,
        keyPrefix: "salesbot",
        points: 50,
        duration: 3600,       // 1 hour
        blockDuration: 3600   // Block for 1 hour
      });

      leadsLimiter = limiterFactory({
        redisClient: redis,
        keyPrefix: "leads",
        points: 10,
        duration: 3600,       // 1 hour
        blockDuration: 900    // Block for 15 min
      });

      blogCreateLimiter = limiterFactory({ redisClient: redis, keyPrefix: "blogcreate", points: 10, duration: 3600 });
      publicLimiter = limiterFactory({ redisClient: redis, keyPrefix: "public", points: 100, duration: 60 });
      changePasswordLimiterLimiter = limiterFactory({ redisClient: redis, keyPrefix: "change-password", points: 3, duration: 900, blockDuration: 1800 });
      redisHealthLimiter = limiterFactory({ redisClient: redis, keyPrefix: "health", points: 30, duration: 60, blockDuration: 300 });

      console.log("[Redis + Rate Limiting] Initialized ✅");
    } catch (err) {
      console.error("[Redis Init Error ❌]", err);
    }
  })();

  const waitForRedis = (req, res, next) =>
    redis ? next() : res.status(503).json({ error: "Service is initializing, please try again shortly." });

  const rateLimitMiddleware = (limiter) =>
    isProd
      ? async (req, res, next) => {
          const realIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
          try {
            await limiter.consume(realIp);
            next();
          } catch {
            res.status(429).json({ error: "Too many requests" });
          }
        }
      : (req, res, next) => next(); // Skip in dev

  
  app.use("/api", waitForRedis, rateLimitMiddleware(sensitiveLimiter), registerRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(sensitiveLimiter), paymentRoute);
  app.use("/api", waitForRedis, squareWebhookRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(sensitiveLimiter), contactRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(sensitiveLimiter), sendOtpRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(verifyLimiter), verifyOtpRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(updateTokenLimiter), updateTokenRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(salesbotLimiter), salesbotRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(leadsLimiter), leadsRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(blogCreateLimiter), blogCreateRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(publicLimiter), listRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(publicLimiter), blogRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(changePasswordLimiter), changePasswordRoute);
  app.use("/api", waitForRedis, rateLimitMiddleware(redisHealthLimiter), healthRoute);

  // Sanitizer
  app.use(makeSanitizer());

  // Error handlers
  app.use((err, req, res, next) => {
    if (err.code === "EBADCSRFTOKEN") return res.status(403).json({ error: "Invalid CSRF token" });
    next(err);
  });

  app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}

module.exports = { initBackend };