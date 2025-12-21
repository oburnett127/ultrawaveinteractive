// backend/index.cjs
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

const {
  createRedisClient,
} = require("./lib/redisClient.cjs");

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
  app.set("trust proxy", true);

  // -------------------------------------------------
  // ☁️ Cloudflare request normalization
  // -------------------------------------------------
  app.use((req, res, next) => {
    // Real client IP (Cloudflare first)
    req.realIp =
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip;

    // Original protocol
    req.realProtocol =
      req.headers["x-forwarded-proto"] || req.protocol;

    // Cloudflare metadata (optional but useful)
    req.cf = {
      ray: req.headers["cf-ray"],
      country: req.headers["cf-ipcountry"],
      colo: req.headers["cf-colo"],
    };

    next();
  });

  // -------------------------------------------------
  // 🍪 Cookies (safe globally)
  // -------------------------------------------------
  app.use(cookieParser());

  // -------------------------------------------------
  // 🛡️ Helmet CSP
  // (nonce injected earlier by server.cjs)
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
  // 🌍 CORS (usually disabled in unified setup)
  // -------------------------------------------------
  if (boolFromEnv(process.env.ENABLE_CORS, false)) {
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

  app.use(
    "/api/square/webhook",
    express.raw({ type: "*/*" }),
    squareWebhookRoute
  );

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

  return app;
};