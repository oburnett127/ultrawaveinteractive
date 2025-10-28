// index.cjs
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const Redis = require("ioredis");
const { RedisStore } = require("rate-limit-redis"); // npm i rate-limit-redis
const sanitizeHtml = require("sanitize-html");

// --- Your route modules ---
const blogRoute = require("./routes/blog.route.cjs");
const blogCreateRoute = require("./routes/blogCreate.route.cjs");
const listRoute = require("./routes/list.route.cjs");
const paymentRoute = require("./routes/payment.route.cjs");
const peekRoute = require("./routes/peek.route.cjs");
const registerRoute = require("./routes/register.route.cjs");
const salesbotRoute = require("./routes/salesbot.route.cjs");
const sendRoute = require("./routes/send.route.cjs"); // (likely /api/otp/send)
const squareWebhookRoute = require("./routes/squareWebhook.route.cjs");
const updateTokenRoute = require("./routes/updateToken.route.cjs");
const verifyRoute = require("./routes/verify.route.cjs"); // (likely /api/otp/verify or /api/verify-recaptcha)

// --- Helpers ---
function boolFromEnv(v, def = false) {
  if (v === undefined) return def;
  return /^(1|true|yes|on)$/i.test(String(v));
}

function makeSanitizer(options = {}) {
  return function sanitizeBody(req, _res, next) {
    // Shallow sanitize (good baseline). Deep sanitize can be added if needed.
    if (req.body && typeof req.body === "object") {
      for (const [k, v] of Object.entries(req.body)) {
        if (typeof v === "string") {
          req.body[k] = sanitizeHtml(v, {
            allowedTags: [],
            allowedAttributes: {},
            ...options,
          }).trim();
        }
      }
    }
    next();
  };
}

function createRedisClient() {
  // Works with Northflank/Cloud providers. Example env:
  // REDIS_URL=redis://:password@hostname:6379/0
  // or REDIS_HOST/REDIS_PORT/REDIS_PASSWORD
  const url = process.env.REDIS_URL;
  if (url) return new Redis(url);

  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD || undefined;
  const db = Number(process.env.REDIS_DB || 0);

  return new Redis({ host, port, password, db, lazyConnect: false });
}

function limiterFactory({ redis, windowMs, max, message, keyPrefix }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message,
    keyGenerator: (req) => req.ip, // trust proxy must be set
    store: new RedisStore({
      // ioredis integration for rate-limit-redis@4
      // https://github.com/wyattjoh/rate-limit-redis
      sendCommand: (...args) => redis.call(...args),
      prefix: keyPrefix || "rl:",
    }),
  });
}

async function initBackend(app) {
  // 1) Env + basics
  dotenv.config();
  const isProd = process.env.NODE_ENV === "production";
  const enableCors = boolFromEnv(process.env.ENABLE_CORS, true);

  // Behind Cloudflare / load balancer -> needed so req.ip is correct
  app.set("trust proxy", 1);

  // 2) Per-request CSP nonce (before Helmet)
  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
    next();
  });

  // 3) Helmet (dynamic import since Helmet v8 is ESM)
  const helmet = (await import("helmet")).default;

  app.use((req, res, next) => {
    const nonce = res.locals.cspNonce;

    const directives = {
      "default-src": ["'self'"],

      "script-src": [
        "'self'",
        `'nonce-${nonce}'`,
        ...(isProd ? [] : ["'unsafe-eval'"]),
        "https://web.squarecdn.com",
        "https://js.squareup.com",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://static.cloudflareinsights.com",
        "https://challenges.cloudflare.com",
        // add sandbox if you use Square sandbox:
        // "https://sandbox.web.squarecdn.com",
      ],

      "style-src": [
        "'self'",
        `'nonce-${nonce}'`,
        "https://fonts.googleapis.com",
        "https://web.squarecdn.com",
        "https://www.gstatic.com",
      ],

      // Keep elem relaxed for injected styles by SDKs/Next/recaptcha
      "style-src-elem": [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://web.squarecdn.com",
        "https://www.gstatic.com",
      ],

      "frame-src": [
        "'self'",
        "https://web.squarecdn.com",
        "https://pci-connect.squareup.com",
        "https://js.squareup.com",
        "https://www.google.com",
        "https://recaptcha.google.com",
        "https://challenges.cloudflare.com",
      ],

      "connect-src": [
        "'self'",
        "https://ultrawaveinteractive.com",
        "https://connect.squareup.com",
        "https://pci-connect.squareup.com",
        "https://web.squarecdn.com",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://static.cloudflareinsights.com",
        ...(isProd ? [] : ["http://localhost:3000", "ws://localhost:3000"]),
      ],

      "img-src": [
        "'self'",
        "data:",
        "blob:",
        "https://*.squarecdn.com",
        "https://web.squarecdn.com",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://static.cloudflareinsights.com",
      ],

      "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
      "worker-src": ["'self'", "blob:"],
      "media-src": ["'self'", "data:", "blob:"],
      "manifest-src": ["'self'"],
      "form-action": ["'self'"],
      "object-src": ["'none'"],
      "frame-ancestors": ["'none'"],
      "upgrade-insecure-requests": [],
      "base-uri": ["'self'"],
      "script-src-attr": ["'none'"],
    };

    return helmet({
      contentSecurityPolicy: { useDefaults: false, directives },
      referrerPolicy: { policy: "no-referrer-when-downgrade" },
      frameguard: { action: "deny" },
      noSniff: true,
      permittedCrossDomainPolicies: true,
      // xssFilter removed in Helmet v5+, CSP replaces it
    })(req, res, next);
  });

  // 4) CORS (place BEFORE rate limits so preflights don't get throttled)
  if (enableCors) {
    const corsOptions = {
      origin: [
        "http://localhost:3000",
        "https://ultrawaveinteractive.com",
      ],
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      maxAge: 86400, // cache preflight for a day
    };
    app.use(cors(corsOptions));
  }

  // Quick method guard (optional; still allow OPTIONS)
  app.use((req, res, next) => {
    const allowedMethods = ["GET", "POST", "DELETE", "OPTIONS"];
    if (req.method === "OPTIONS") return res.sendStatus(204);
    if (!allowedMethods.includes(req.method)) {
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed` });
    }
    next();
  });

  // 5) Square webhook MUST see raw body and must be registered BEFORE JSON parser.
  // Your router mounts under /api, so full path is /api/square/webhook
  app.use("/api/square/webhook", express.raw({ type: "application/json" }));

  // 6) Standard body parsers (tighten limits)
  app.use(
    bodyParser.json({
      limit: "512kb", // safer default; bump if you really need more
      strict: true,
    })
  );
  app.use(
    bodyParser.urlencoded({
      extended: true,
      limit: "256kb",
    })
  );

  // 7) Redis-backed rate limiting
  const redis = createRedisClient();

  const sensitiveLimiter = limiterFactory({
    redis,
    windowMs: 60 * 60 * 1000, // 1h
    max: 5,
    message: "Too many requests, please try again later.",
    keyPrefix: "rl:sensitive:",
  });

  const moderateLimiter = limiterFactory({
    redis,
    windowMs: 60 * 60 * 1000,
    max: 300,
    message: "Too many requests, please try again later.",
    keyPrefix: "rl:moderate:",
  });

  const verifyLimiter = limiterFactory({
    redis,
    windowMs: 60 * 1000, // 1 min
    max: 10,
    message: "Too many requests, please try again later.",
    keyPrefix: "rl:verify:",
  });

  const updateTokenLimiter = limiterFactory({
    redis,
    windowMs: 10 * 60 * 1000, // 10 min
    max: 5,
    message: "Too many requests, please try again later.",
    keyPrefix: "rl:update:",
  });

  const salesbotLimiter = limiterFactory({
    redis,
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: "Too many requests, please try again later.",
    keyPrefix: "rl:salesbot:",
  });

  const blogCreateLimiter = limiterFactory({
    redis,
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: "Too many requests, please try again later.",
    keyPrefix: "rl:blogcreate:",
  });

  // Apply limiters to the REAL paths (all under /api/*)
  app.use("/api/auth/register", sensitiveLimiter);
  app.use("/api/contact", sensitiveLimiter);

  // OTP & login surfaces (very important)
  app.use("/api/otp/send", sensitiveLimiter);   // sendRoute
  app.use("/api/otp/verify", verifyLimiter);    // verifyRoute (if path differs, adjust)
  app.use("/api/update-token", updateTokenLimiter);

  app.use("/api/salesbot", salesbotLimiter);

  app.use("/api/blog/create", blogCreateLimiter);
  app.use("/api/blog/list", moderateLimiter);
  app.use("/api/blog", moderateLimiter);

  // If you expose reCAPTCHA verify endpoint:
  app.use("/api/verify-recaptcha", verifyLimiter);

  // 8) Attach a sanitizer you can use inside routers if desired
  // You can also call makeSanitizer() inside specific routers only.
  app.use(makeSanitizer());

  // 9) Register routes (now safely behind Helmet/CORS/limits)
  app.use("/api", blogRoute);
  app.use("/api", blogCreateRoute);
  app.use("/api", listRoute);
  app.use("/api", paymentRoute);
  app.use("/api", peekRoute);
  app.use("/api", registerRoute);
  app.use("/api", salesbotRoute);
  app.use("/api", sendRoute);
  app.use("/api", squareWebhookRoute);
  app.use("/api", updateTokenRoute);
  app.use("/api", verifyRoute);

  // 10) Error handlers (last)
  // Note: If you actually use CSRF middleware elsewhere, keep this; otherwise it’s harmless.
  app.use((err, req, res, next) => {
    if (err && err.code === "EBADCSRFTOKEN") {
      return res.status(403).json({ error: "Invalid CSRF token" });
    }
    return next(err);
  });

  app.use((err, req, res, _next) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}

module.exports = { initBackend };