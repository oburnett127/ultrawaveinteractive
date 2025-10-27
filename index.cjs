const express = require('express');
const app = express();
const  cors = require('cors');
const  dotenv = require('dotenv');
const  crypto = require('crypto');
const  rateLimit = require('express-rate-limit');
const  bodyParser = require('body-parser');
const  Redis = require("ioredis");
const { sendContactEmail } = require("./lib/mailer.cjs");
const sanitizeHtml = require("sanitize-html");
//const squareWebhookHandler = require("./lib/squareWebhookHandler");

const blogRoute = require("./routes/blog");
const blogCreateRoute = require("./routes/blogCreate");
const listRoute = require("./routes/list");
const paymentRoute = require("./routes/payment");
const peekRoute = require("./routes/peek");
const registerRoute = require("./routes/register");
const salesbotRoute = require("./routes/salesbot");
const sendRoute = require("./routes/send");
const squareWebhookRoute = require("./routes/squareWebhook");
const updateTokenRoute = require("./routes/updateToken");
const verifyRoute = require("./routes/verify");

async function initBackend(app) {
  // ✅ Load environment
  dotenv.config();

  // ✅ RAW body parser for Square webhook (must be FIRST)
  app.use("/api/square/webhook", express.raw({ type: "application/json" })
  );

  // ✅ Standard body parsers (after RAW route)
  app.use(bodyParser.json({ limit: "2gb" }));
  app.use(bodyParser.urlencoded({ extended: true }));

  // ✅ Rate limiting
  const sensitiveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: "Too many requests, please try again later.",
    // standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    // legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  const moderateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 300,
    message: "Too many requests, please try again later.",
    // standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    // legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  const verifyLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: "Too many requests, please try again later.",
    // standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    // legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  const updateTokenLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: "Too many requests, please try again later.",
    // standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    // legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  const salesbotLimiter = rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 30,
      message: "Too many requests, please try again later.",
      // standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      // legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });

  const blogCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: "Too many requests, please try again later.",
    // standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    // legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  app.use("/auth/register", sensitiveLimiter);
  // app.use("/otp/send", sensitiveLimiter); //fallback only
  // app.use("/otp/verify", sensitiveLimiter); //fallback only
  app.use("/contact", sensitiveLimiter);

  app.use("/blog/list", moderateLimiter);
  app.use("/blog", moderateLimiter);

  app.use("/verify-recaptcha", verifyLimiter);

  app.use("/update-token", updateTokenLimiter);

  app.use("/salesbot", salesbotLimiter);

  app.use("/blog/create", blogCreateLimiter);
  


  //verify recaptcha and contact routes rate limited?












  const corsOptions = {
    origin: [
      "http://localhost:3000",
      "https://ultrawaveinteractive.com",
    ],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  };

  app.use(cors(corsOptions));

  // --- Restrict HTTP methods ---
  app.use((req, res, next) => {
    const allowedMethods = ["GET", "POST", "DELETE", "OPTIONS"];
    if (!allowedMethods.includes(req.method)) {
      return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }
    next();
  });

  const isDev = process.env.NODE_ENV !== "production";

  // --- Per-request CSP nonce ---
  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
    next();
  });

  // --- Helmet v8 (ESM-only): dynamic import in CJS ---
  const helmet = (await import("helmet")).default;

  // --- Single Helmet middleware (MUST run before routes/Next handler) ---
  app.use((req, res, next) => {
    const nonce = res.locals.cspNonce;

    const directives = {
      "default-src": ["'self'"],

      // No 'unsafe-inline' here anymore:
      "script-src": [
        "'self'",
        `'nonce-${nonce}'`,
        ...(isDev ? ["'unsafe-eval'"] : []), // keep only for dev HMR
        "https://web.squarecdn.com",
        "https://js.squareup.com",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://static.cloudflareinsights.com",
        "https://challenges.cloudflare.com",
        // remove sandbox when fully live:
        // "https://sandbox.web.squarecdn.com",
      ],

      // Keep this strict (nonce). This covers any inline <style nonce="..."> you author.
      "style-src": [
        "'self'",
        `'nonce-${nonce}'`,
        "https://fonts.googleapis.com",
        "https://web.squarecdn.com",
        "https://www.gstatic.com",
      ],

      // Leave this to allow SDK/Next/reCAPTCHA injected <style> tags
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
        ...(isDev ? ["http://localhost:3000", "ws://localhost:3000"] : []),
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
    })(req, res, next);
  });

  return app;
}

  // ✅ Register Express-powered backend routes
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

  // ✅ Global error handlers
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

module.exports = { initBackend };