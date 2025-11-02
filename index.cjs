// index.cjs
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const sanitizeHtml = require("sanitize-html");
const { createRedisClient, limiterFactory } = require("./lib/redisClient.cjs");

// --- Your route modules ---
const listRoute = require("./routes/list.route.cjs");
const blogRoute = require("./routes/blog.route.cjs");
const blogCreateRoute = require("./routes/blogCreate.route.cjs");
const contactRoute = require("./routes/contact.route.cjs");
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
    globalThis.__CSP_NONCE__ = res.locals.cspNonce; // Used in _document.js
    next();
  });

  // 3) Helmet setup (dynamic import)
  const helmet = (await import("helmet")).default;

  app.use((req, res, next) => {
    const nonce = res.locals.cspNonce;

    const directives = {
      "default-src": ["'self'"],

      // ✅ Scripts (Next inline hydration + Square + reCAPTCHA)
      "script-src": [
        "'self'",
        `'nonce-${nonce}'`,
        ...(isProd ? [] : ["'unsafe-eval'"]), // Needed for Next.js dev/HMR
        "https://web.squarecdn.com",
        "https://js.squareup.com",
        "https://sandbox.web.squarecdn.com",
        "https://cdn.jsdelivr.net",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://static.cloudflareinsights.com",
        "https://challenges.cloudflare.com",
      ],

      // ✅ For external <script src="..."> tags
      "script-src-elem": [
        "'self'",
        `'nonce-${nonce}'`,
        ...(isProd ? [] : ["'unsafe-eval'"]),
        "https://web.squarecdn.com",
        "https://js.squareup.com",
        "https://sandbox.web.squarecdn.com",
        "https://cdn.jsdelivr.net",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://static.cloudflareinsights.com",
        "https://challenges.cloudflare.com",
      ],

      // Block dangerous script attributes (e.g., onclick)
      "script-src-attr": ["'none'"],

      // ✅ Allow inline *styles only* (no inline JS!)
      // Needed for CookieConsent, reCAPTCHA, and Square injected styles
      "style-src": [
        "'self'",
        `'nonce-${nonce}'`,
        "https://fonts.googleapis.com",
        "https://web.squarecdn.com",
        "https://www.gstatic.com",
        "https://cdn.jsdelivr.net",
      ],

      // ✅ Inline <style> tags are safe here (low risk)
      "style-src-elem": [
        "'self'",
        "'unsafe-inline'", // ✅ Allow inline styles only (safe)
        "https://fonts.googleapis.com",
        "https://web.squarecdn.com",
        "https://www.gstatic.com",
        "https://cdn.jsdelivr.net",
      ],

      // ✅ Square + reCAPTCHA frames
      "frame-src": [
        "'self'",
        "https://web.squarecdn.com",
        "https://sandbox.web.squarecdn.com",
        "https://pci-connect.squareup.com",
        "https://js.squareup.com",
        "https://www.google.com",
        "https://recaptcha.google.com",
        "https://challenges.cloudflare.com",
      ],

      // ✅ API, WebSocket, and CDN connections
      "connect-src": [
        "'self'",
        "https://ultrawaveinteractive.com",
        "https://connect.squareup.com",
        "https://pci-connect.squareup.com",
        "https://web.squarecdn.com",
        "https://sandbox.web.squarecdn.com",
        "https://cdn.jsdelivr.net",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://static.cloudflareinsights.com",
        ...(isProd
          ? []
          : [
              "http://localhost:3000",
              "ws://localhost:3000",
              "http://127.0.0.1:3000",
              "ws://127.0.0.1:3000",
            ]),
      ],

      // ✅ Images
      "img-src": [
        "'self'",
        "data:",
        "blob:",
        "https://cdn.jsdelivr.net",
        "https://*.squarecdn.com",
        "https://web.squarecdn.com",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://static.cloudflareinsights.com",
        ...(isProd ? [] : ["http://localhost:3000"]),
      ],

      "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
      "worker-src": ["'self'", "blob:"],
      "media-src": ["'self'", "data:", "blob:"],
      "manifest-src": ["'self'"],
      "form-action": ["'self'"],
      "object-src": ["'none'"],
      "frame-ancestors": ["'none'"],
      "base-uri": ["'self'"],
      "upgrade-insecure-requests": [],
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

 // 7) Redis-backed rate limiting using rate-limiter-flexible
const { createRedisClient, limiterFactory } = require("./lib/redisClient.cjs");

let redis;
let sensitiveLimiter, verifyLimiter, updateTokenLimiter, salesbotLimiter, blogCreateLimiter, publicLimiter;

(async () => {
  try {
    redis = await createRedisClient();

    console.log("🔍 REDIS_URL:", process.env.REDIS_URL);

    // --- Rate limiters based on sensitivity ---

    // Highly sensitive: signup, login, OTP, etc.
    sensitiveLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "sensitive",
      points: 5,            // max requests
      duration: 3600,       // per 1 hour
      blockDuration: 1800,  // block for 30 minutes
    });

    // OTP validation
    verifyLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "verify",
      points: 10,
      duration: 60,         // per 1 minute
      blockDuration: 300,   // block for 5 minutes
    });

    // Token update
    updateTokenLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "update",
      points: 5,
      duration: 600,        // per 10 minutes
      blockDuration: 1800,  // block for 30 minutes
    });

    // Sales bot
    salesbotLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "salesbot",
      points: 30,
      duration: 3600,       // per 1 hour
      blockDuration: 1800,  // block for 30 minutes
    });

    // Blog post creation (admin only)
    blogCreateLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "blogcreate",
      points: 10,
      duration: 3600,       // per 1 hour
      blockDuration: 1800,  // block for 30 minutes
    });

    // Public-friendly API (blog list, etc.)
    publicLimiter = limiterFactory({
      redisClient: redis,
      keyPrefix: "public",
      points: 100,          // Allow up to 100 requests
      duration: 60,         // per 1 minute
      blockDuration: 10,    // block for 10 seconds
    });

    console.log("[Redis + Rate Limiting] Initialized ✅");
  } catch (err) {
    console.error("[Redis Init Error ❌]", err);
  }
})();

// Middleware to wait for Redis initialization
function waitForRedis(req, res, next) {
  if (!redis || !sensitiveLimiter) {
    return res
      .status(503)
      .json({ error: "Service is starting, please try again shortly." });
  }
  next();
}

// Rate limiter middleware factory
function rateLimitMiddleware(limiter) {
  // Disable in dev
  if (process.env.NODE_ENV !== "production") {
    return (req, res, next) => next();
  }

  // Resolve client IP behind Cloudflare
  return async (req, res, next) => {
    const realIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
    try {
      await limiter.consume(realIp);
      next();
    } catch {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
  };
}

  // Auth register
  app.post("/api/auth/register", waitForRedis, rateLimitMiddleware(sensitiveLimiter), registerRoute);
  
  app.post("/api/payment/charge", waitForRedis, rateLimitMiddleware(sensitiveLimiter), paymentRoute);

  app.post("/api/squareWebhook", waitForRedis, rateLimitMiddleware(sensitiveLimiter), squareWebhookRoute);

  // Contact form
  app.post("/api/contact", waitForRedis, rateLimitMiddleware(sensitiveLimiter), contactRoute);

  // OTP (send / verify)
  app.post("/api/otp/send", waitForRedis, rateLimitMiddleware(sensitiveLimiter), sendRoute);
  app.post("/api/otp/verify", waitForRedis, rateLimitMiddleware(verifyLimiter), verifyRoute);

  // Update token
  app.post("/api/update-token", waitForRedis, rateLimitMiddleware(updateTokenLimiter), updateTokenRoute);

  // Sales bot
  app.post("/api/salesbot", waitForRedis, rateLimitMiddleware(salesbotLimiter), salesbotRoute);

  // Blog (create / list / slug)
  app.post("/api/blog/create", waitForRedis, rateLimitMiddleware(blogCreateLimiter), blogCreateRoute);
  app.get("/api/blog/list", waitForRedis, rateLimitMiddleware(publicLimiter), listRoute);
  app.get("/api/blog/:slug", waitForRedis, rateLimitMiddleware(publicLimiter), blogRoute);

  // 8) Attach a sanitizer you can use inside routers if desired
  // You can also call makeSanitizer() inside specific routers only.
  app.use(makeSanitizer());

  // 9) Register routes (now safely behind Helmet/CORS/limits)

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