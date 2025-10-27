const express = require('express');
const app = express();
const  cors = require('cors');
const  { Client, Environment } = require('square');
const  dotenv = require('dotenv');
const  crypto = require('crypto');
const  rateLimit = require('express-rate-limit');
const  bodyParser = require('body-parser');
const  Redis = require("ioredis");
const { sendContactEmail } = require("./lib/mailer.cjs");
const sanitizeHtml = require("sanitize-html");
//const squareWebhookHandler = require("./lib/squareWebhookHandler");

// ✅ Import your route files
const blogCreateRoute = require("./routes/blogCreate");
const salesbotRoute = require("./routes/salesbot");
const updateTokenRoute = require("./routes/updateToken");

//import the rest of your route files

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
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: "Too many requests, please try again later.",
    // standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    // legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Apply rate limiter to specific routes
  app.use("/process-payment", apiLimiter);
  app.use("/send-otp", apiLimiter);
  app.use("/verify-otp", apiLimiter);
  app.use("/contact", apiLimiter);
  app.use("/verify-recaptcha", apiLimiter);

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

  // ✅ Redis connection
  const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

  // ✅ Initialize Square client
  const squareClient = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.NODE_ENV === "production" ? Environment.Production : Environment.Sandbox,
  });

  // Zod schema for payment validation
  // const paymentSchema = z.object({
  //   googleProviderId: z.string().min(1, "Google Provider ID is required"), // Must be a non-empty string
  //   email: z.string().email("Invalid email format"), // Standard email validation
  //   nonce: z.string().min(1, "Nonce is required"), // Nonce must be present
  //   amount: z.number().positive("Amount must be greater than 0"), // Positive number validation
  // });

  // ✅ Define or import reusable middleware
  const validatePaymentRequest = (req, res, next) => {
    const { googleProviderId, email, receiptEmail, nonce, amount } = req.body;
    if (!googleProviderId || !email || !receiptEmail || !nonce || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    req.validatedData = { googleProviderId, email, receiptEmail, nonce, amount };
    next();
  };

  // ✅ Register Express-powered backend routes
  app.use("/api", blogCreateRoute);
  app.use("/api", salesbotRoute);
  app.use("/api", updateTokenRoute);


  //REGISTER THE REST OF YOUR BACKEND ROUTES <==============


  // ✅ Square Webhook Handler Example
  app.post("/api/square/webhook", async (req, res) => {
    // squareWebhookHandler logic goes here...
  });

  // ✅ Payment route example
  app.post("/process-payment", validatePaymentRequest, async (req, res) => {
    try {
      const { googleProviderId, email, receiptEmail, nonce, amount } = req.validatedData;

      // Convert the amount to cents (ensure it's a valid BigInt for Square)
      const amountInCents = BigInt(amount);

      // Create a unique idempotency key
      const idempotencyKey = crypto.randomUUID();

      // console.log('Processing payment with the following details:');
      // console.log({
      //   googleProviderId,
      //   email,
      //   receiptEmail,
      //   nonce,
      //   amount: amountInCents.toString(),
      //   idempotencyKey,
      // });

      // Create the payment request to Square API
      const paymentResponse = await squareClient.paymentsApi.createPayment({
        sourceId: nonce, // The payment token from the frontend
        idempotencyKey, // Ensures no duplicate payments
        amountMoney: {
          amount: amountInCents, // Amount in cents as BigInt
          currency: 'USD', // Use your preferred currency
        },
        buyerEmailAddress: receiptEmail,
        referenceId: googleProviderId,
        note: `Payment by user: ${email}`,
      });

      //console.log('Payment response from Square:', paymentResponse);

      // Convert BigInt values in the response to strings for JSON compatibility
      const sanitizedResponse = JSON.parse(
        JSON.stringify(paymentResponse.result, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      );

      // Respond with success
      res.status(200).json({
        success: true,
        payment: sanitizedResponse.payment,
      });
    } catch (error) {
      console.error('Error during payment processing:', error);

      // Handle errors from Square API or other unknown errors
      if (error instanceof Error && error.message) {
        res.status(500).json({ error: `Square API Error: ${error.message}` });
      } else if (error.result && error.result.errors) {
        res.status(500).json({ error: error.result.errors[0]?.detail || 'Payment failed' });
      } else {
        res.status(500).json({ error: 'An unknown error occurred during payment processing' });
      }
    }
  });

  // ✅ Contact route example
  app.post("/contact", async (req, res) => {
    try {
        const { email, name, phone, message, recaptchaToken } = req.body || {};

        if (!email || !message) {
          return res.status(400).json({ error: "Email and message are required." });
        }

        const fromEmail = String(email).trim();
        const fromName = name ? String(name).trim() : "";
        const fromPhone = phone ? String(phone).trim() : "";

        // Sanitize the message
        const safeMessage = sanitizeHtml(message, {
          allowedTags: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li"],
          allowedAttributes: {}, // no attributes allowed
        });

        // Verify reCAPTCHA
        if (!recaptchaToken) {
          return res.status(400).json({ error: "Missing reCAPTCHA token" });
        }
        const response = await verifyRecaptchaToken(recaptchaToken);
        if (!response.success) {
          return res.status(400).json({ error: "Failed reCAPTCHA verification" });
        }

        await sendContactEmail({
          fromEmail,
          name: fromName,
          phone: fromPhone,
          message: safeMessage,
        });

        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error("Error sending contact email:", err);
        return res.status(500).json({ error: "Failed to send email." });
      }
  });

  async function verifyRecaptchaToken(token) {
    if (!token) {
      return { success: false, "error-codes": ["missing-input-response"] }; // Token is missing
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.error("Missing reCAPTCHA secret key in environment variables.");
      return { success: false, "error-codes": ["missing-secret-key"] };
    }

    const verificationURL = "https://www.google.com/recaptcha/api/siteverify";

    try {
      const response = await fetch(verificationURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
        }).toString(),
      });

      if (response.ok === false) {
        console.error(`reCAPTCHA verification failed: ${response.statusText}`);
        return { success: false, "error-codes": ["verification-failed"] };
      }

      const data = (await response.json());
      //console.log("Google's reCAPTCHA verification response:", data); // Debugging

      // Handle failure from Google's response
      if (data.success === false) {
        console.error("reCAPTCHA verification failed:", data);
        return { success: false, "error-codes": data["error-codes"] };
      }

      // Success case
      return data;
    } catch (error) {
      console.error("Error verifying reCAPTCHA token:", error);
      return { success: false, "error-codes": ["internal-error"] };
    }
  }

  // ✅ Recaptcha route example
  app.post("/verify-recaptcha", async (req, res) => {
    const { recaptchaToken } = req.body; //Recaptcha token generated on the frontend by the recaptcha widget

      //console.log("Received reCAPTCHA token:", recaptchaToken); // Debugging

      // Check if the token exists
      if (!recaptchaToken) {
        return res.status(400).json({ success: false, message: "Token is missing." });
      }

      try {
        const data = await verifyRecaptchaToken(recaptchaToken);

        if (data.success === true) {
          return res.status(200).json({ success: true, message: "reCAPTCHA verification successful." });
        } else if(data.success === false) {
          console.error("reCAPTCHA verification failed:", data["error-codes"]);
          return res.status(400).json({
            success: false,
            message: "reCAPTCHA verification failed.",
            errors: data["error-codes"],
          });
        }
      } catch (error) {
        console.error("Error verifying reCAPTCHA:", error.message);
        return res.status(500).json({
          success: false,
          message: "An error occurred during reCAPTCHA verification.",
        });
      }
  });

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