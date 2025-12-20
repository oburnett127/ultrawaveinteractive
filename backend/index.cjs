// backend/index.cjs
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const {
  createRedisClient,
  limiterFactory,
  disconnectRedisClient,
} = require("../backend/lib/redisClient.cjs");
const cookieParser = require("cookie-parser");

dotenv.config();

function boolFromEnv(v, def = false) {
  if (v === undefined) return def;
  return /^(1|true|yes|on)$/i.test(String(v));
}

module.exports.initBackend = async function initBackend(app) {
  const isProd = process.env.NODE_ENV === "production";

  // -------------------------------------------------
  // 🌐 Trust proxy (Cloudflare / Northflank)
  // -------------------------------------------------
  app.set("trust proxy", 1);

  // -------------------------------------------------
  // 🍪 Cookies (safe globally)
  // -------------------------------------------------
  app.use(cookieParser());

  // -------------------------------------------------
  // 🛡️ Helmet CSP
  // (nonce already injected by server.cjs)
  // -------------------------------------------------
  const helmet = (await import("helmet")).default;

  app.use((req, res, next) => {
    const nonce = res.locals.cspNonce;

    if (!isProd) {
      return helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        referrerPolicy: { policy: "no-referrer-when-downgrade" },
        noSniff: true,
        permittedCrossDomainPolicies: true,
      })(req, res, next);
    }

    const directives = {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "object-src": ["'none'"],
      "script-src": [
        "'self'",
        `'nonce-${nonce}'`,
        "blob:",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://sandbox.web.squarecdn.com",
        "https://web.squarecdn.com",
        "https://cdn.jsdelivr.net",
      ],
      "script-src-elem": [
        "'self'",
        `'nonce-${nonce}'`,
        "https://www.google.com",
        "https://www.gstatic.com",
      ],
      "connect-src": [
        "'self'",
        "https://*",
        "https://www.google.com",
        "https://www.gstatic.com",
      ],
      "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
      ],
      "img-src": ["'self'", "data:", "https://*"],
      "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
      "frame-src": [
        "'self'",
        "https://www.google.com",
        "https://*.squareup.com",
        "https://web.squarecdn.com",
      ],
      "trusted-types": ["nextjs", "next-script", "uw-inline"],
      "require-trusted-types-for": ["'script'"],
    };

    return helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives,
        reportOnly: true,
      },
      referrerPolicy: { policy: "no-referrer-when-downgrade" },
      noSniff: true,
      permittedCrossDomainPolicies: true,
    })(req, res, next);
  });

  // -------------------------------------------------
  // 🌍 CORS (only if enabled)
  // -------------------------------------------------
  if (boolFromEnv(process.env.ENABLE_CORS, true)) {
    app.use(
      cors({
        origin: ["http://localhost:3000", "https://ultrawaveinteractive.com"],
        credentials: true,
        methods: ["GET", "POST", "DELETE", "OPTIONS"],
      })
    );
  }

  // -------------------------------------------------
  // 🧾 Preflight
  // -------------------------------------------------
  app.options("*", (_, res) => res.sendStatus(204));

  // -------------------------------------------------
  // 🔔 Square webhook (RAW body only)
  // -------------------------------------------------
  const squareWebhookRoute = require("./routes/squareWebhook.route.cjs");

  app.use(
    "/api/square/webhook",
    express.raw({ type: "*/*" }),
    squareWebhookRoute
  );

  // -------------------------------------------------
  // 📦 Body parsers — API ONLY
  // -------------------------------------------------
  app.use("/api", bodyParser.json({ limit: "1mb" }));
  app.use("/api", bodyParser.urlencoded({ extended: true, limit: "1mb" }));

  // -------------------------------------------------
  // 🧠 Redis + rate limiting
  // -------------------------------------------------
  let redis = null;

  try {
    redis = await createRedisClient();
    console.log("[Redis] Connected ✅");
  } catch (err) {
    console.error("[Redis] Connection failed ❌", err);
  }

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
            await limiter.consume(
              req.headers["x-forwarded-for"]?.split(",")[0] || req.ip
            );
            next();
          } catch {
            res.status(429).json({ error: "Too many requests" });
          }
        }
      : (req, res, next) => next();

  // -------------------------------------------------
  // 🚏 Routes
  // -------------------------------------------------
  const registerRoute = require("./routes/register.route.cjs");
  const paymentRoute = require("./routes/payment.route.cjs");
  const contactRoute = require("./routes/contact.route.cjs");
  const salesbotRoute = require("./routes/salesbot.route.cjs");
  const leadsRoute = require("./routes/leads.route.cjs");
  const blogCreateRoute = require("./routes/blogCreate.route.cjs");
  const listRoute = require("./routes/list.route.cjs");
  const blogRoute = require("./routes/blog.route.cjs");
  const changePasswordRoute = require("./routes/changePassword.route.cjs");
  const healthRoute = require("./routes/health.route.cjs");
  const otpRoute = require("./routes/otp.route.cjs");
  const updateTokenRoute = require("./routes/updateToken.route.cjs");

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
  app.use("/api", waitForRedis, healthRoute);

  return app;
};

// function makeSanitizer(options = {}) {
//   return function sanitizeBody(req, _res, next) {
//     if (req.body && typeof req.body === "object") {
//       for (const [k, v] of Object.entries(req.body)) {
//         if (typeof v === "string") {
//           req.body[k] = sanitizeHtml(v, { allowedTags: [], allowedAttributes: {}, ...options }).trim();
//         }
//       }
//     }
//     next();
//   };
// }
