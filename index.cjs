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

// index.cjs (or wherever this lives)

async function initBackend(app, handle) {
  // Load env vars
  dotenv.config();
  const isProd = process.env.NODE_ENV === "production";

  // Trust proxy for correct IPs behind Cloudflare/Northflank/etc.
  app.set("trust proxy", 1);

  // -------------------------------------------------
  // 1) CSP Nonce middleware (for Helmet + Next.js)
  // -------------------------------------------------
  app.use((req, res, next) => {
    const nonce = crypto.randomBytes(16).toString("base64");
    res.locals.cspNonce = nonce;
    // Optional global for compatibility with other code
    globalThis.__CSP_NONCE__ = nonce;
    next();
  });

  // Simple request logger
  app.use((req, res, next) => {
    console.log("➡️ Incoming request:", req.method, req.url);
    next();
  });

  // -------------------------------------------------
  // 2) Helmet CSP (fixed for Next.js + Square + reCAPTCHA)
  // -------------------------------------------------
  const helmet = (await import("helmet")).default;

// -------------------------------------------------------------
// HELMET CSP — CORRECTED (DO NOT SKIP /_next ROUTES)
// -------------------------------------------------------------
app.use((req, res, next) => {
  const nonce = res.locals.cspNonce;
  const isProd = process.env.NODE_ENV === "production";

  const directives = {
    "default-src": ["'self'"],

    "base-uri": ["'self'"],

    "font-src": [
      "'self'",
      "https://fonts.gstatic.com",
      "data:",
    ],

    "img-src": [
      "'self'",
      "data:",
      "https://*",
    ],

    "object-src": ["'none'"],

    // ---------------------------------------------------------
    // SCRIPT-SRC — allow Next.js runtime + reCAPTCHA + Square
    // ---------------------------------------------------------
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,

      // reCAPTCHA
      "https://www.google.com",
      "https://www.gstatic.com",

      // Square
      "https://sandbox.web.squarecdn.com",
      "https://web.squarecdn.com",

      // jsDelivr CDN
      "https://cdn.jsdelivr.net",

      ...(isProd
        ? [
            // Next.js static chunks in production
            "https://ultrawaveinteractive.com/_next/",
            "https://ultrawaveinteractive.com/_next/static/",
          ]
        : [
            // Next.js development
            "'unsafe-eval'",
            "'unsafe-inline'",
            "http://localhost:3000",
            "http://localhost:3000/_next/",
            "http://localhost:3000/_next/static/",
          ]),
    ],

    // ---------------------------------------------------------
    // STYLE-SRC — allow Next.js inline styles + fonts
    // ---------------------------------------------------------
    "style-src": [
      "'self'",
      "'unsafe-inline'", // required by Next.js
      "https://fonts.googleapis.com",
      "https://cdn.jsdelivr.net",

      ...(isProd
        ? [
            "https://ultrawaveinteractive.com/_next/",
            "https://ultrawaveinteractive.com/_next/static/",
          ]
        : [
            "http://localhost:3000/_next/",
          ]),
    ],

    // ---------------------------------------------------------
    // CONNECT-SRC — hydration, API calls, HMR in dev
    // ---------------------------------------------------------
    "connect-src": [
      "'self'",
      "https://*",

      ...(isProd
        ? [
            "https://ultrawaveinteractive.com/_next/",
            "https://ultrawaveinteractive.com/_next/static/",
          ]
        : [
            "ws://localhost:3000",
            "http://localhost:3000/_next/",
          ]),
    ],

    // ---------------------------------------------------------
    // FRAME-SRC — for reCAPTCHA + Square iframes
    // ---------------------------------------------------------
    "frame-src": [
      "'self'",
      "https://www.google.com",
      "https://*.squareup.com",
      "https://web.squarecdn.com",
    ],
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

  // -------------------------------------------------
  // 3) CORS (only where needed; still safe for your setup)
  // -------------------------------------------------
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

  // Preflight OPTIONS
  app.use((req, res, next) => {
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // -------------------------------------------------
  // 4) Square Webhook (RAW body) — BEFORE bodyParser.json()
  // -------------------------------------------------
  app.use(
    "/api/square/webhook",
    express.raw({ type: "*/*" }),
    squareWebhookRoute
  );

  // -------------------------------------------------
  // 5) Standard body parsers for JSON + forms
  // -------------------------------------------------
  app.use(bodyParser.json({ limit: "1mb" }));
  app.use(bodyParser.urlencoded({ extended: true, limit: "1mb" }));

  // -------------------------------------------------
  // 6) Redis + rate limiters (awaited cleanly)
  // -------------------------------------------------
  let redis = null;
  let sensitiveLimiter;
  let verifyLimiter;
  let updateTokenLimiter;
  let salesbotLimiter;
  let leadsLimiter;
  let blogCreateLimiter;
  let publicLimiter;
  let changePasswordLimiter;
  let redisHealthLimiter;

  try {
    redis = await createRedisClient();
    console.log("🔍 REDIS_URL:", process.env.REDIS_URL);

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

    redisHealthLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "health",
      points: 30,
      duration: 60,
      blockDuration: 300,
    });

    console.log("[Redis + Rate Limiting] Initialized ✅");
  } catch (err) {
    console.error("[Redis Init Error ❌]", err);
    // Leave redis = null; waitForRedis will 503 API routes until it's ready
  }

  // Helper middleware — require Redis for API routes only
  const waitForRedis = (req, res, next) => {
    if (!redis) {
      return res
        .status(503)
        .json({ error: "Service is initializing, please try again shortly." });
    }
    next();
  };

  // Rate limit wrapper
  const rateLimitMiddleware = (limiter) =>
    isProd
      ? async (req, res, next) => {
          const realIp =
            req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;

          try {
            await limiter.consume(realIp);
            next();
          } catch {
            res.status(429).json({ error: "Too many requests" });
          }
        }
      : (req, res, next) => next(); // skip rate limiting in dev

  // -------------------------------------------------
  // 7) API routes — group by whether they self-handle limiting
  // -------------------------------------------------

  // These routes have rate limiting inside their own route modules
  app.use("/api", waitForRedis, registerRoute);
  app.use("/api", waitForRedis, paymentRoute);
  app.use("/api", waitForRedis, contactRoute);
  app.use("/api", waitForRedis, sendOtpRoute);
  app.use("/api", waitForRedis, verifyOtpRoute);
  app.use("/api", waitForRedis, salesbotRoute);
  app.use("/api", waitForRedis, leadsRoute);
  app.use("/api", waitForRedis, blogCreateRoute);
  app.use("/api", waitForRedis, listRoute);
  app.use("/api", waitForRedis, changePasswordRoute);

  // These routes use the shared rateLimitMiddleware here
  app.use("/api", waitForRedis, rateLimitMiddleware(publicLimiter), blogRoute);
  app.use(
    "/api",
    waitForRedis,
    rateLimitMiddleware(updateTokenLimiter),
    updateTokenRoute
  );
  app.use(
    "/api",
    waitForRedis,
    rateLimitMiddleware(redisHealthLimiter),
    healthRoute
  );

  // -------------------------------------------------
  // 8) Sanitizer (runs on all remaining requests, including Next pages)
  // -------------------------------------------------
  app.use(makeSanitizer());

  // -------------------------------------------------
  // 9) Next.js handler — MUST BE LAST for all non-API routes
  // -------------------------------------------------
  app.all("*", (req, res) => {
    return handle(req, res, { cspNonce: res.locals.cspNonce });
  });

  // -------------------------------------------------
  // 10) Error handlers
  // -------------------------------------------------
  app.use((err, req, res, next) => {
    if (err.code === "EBADCSRFTOKEN") {
      return res.status(403).json({ error: "Invalid CSRF token" });
    }
    next(err);
  });

  app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}

module.exports = { initBackend };