const express = require('express');
const app = express();
const  cors = require('cors');
const  { Client, Environment } = require('square');
const  dotenv = require('dotenv');
const  crypto = require('crypto');
const  rateLimit = require('express-rate-limit');
const  bodyParser = require('body-parser');
const  { z } = require('zod');
const  Redis = require("ioredis");
const  nodemailer = require('nodemailer');
const  { google } = require("googleapis");
const  helmet = require('helmet');
const  { logger } = require('./config/logger.cjs');
const  connectRedis = require('./lib/redis.cjs');
const prisma = require("./lib/prisma.cjs");
const { sendContactEmail } = require("./lib/mailer.cjs");
const sanitizeHtml = require("sanitize-html");

// ⬇️ Exported setup function
async function initBackend(app) {
  dotenv.config(); // Load environment variables

  // CORS middleware
  const corsOptions = {
    origin: "http://localhost:3000", // Adjust as needed
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  };
  app.use(cors(corsOptions));

  // Restrict HTTP methods
  app.use((req, res, next) => {
    const allowedMethods = ["GET", "POST", "DELETE", "OPTIONS"];
    if (!allowedMethods.includes(req.method)) {
      res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }
    next();
  });

  const isDev = process.env.NODE_ENV === 'development';

  app.use((req, res, next) => {
    // 16 bytes is fine; base64 makes it CSP-friendly
    res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
    next();
  });

app.use((req, res, next) => {
  const dev = process.env.NODE_ENV !== "production";
  const nonce = res.locals.cspNonce;

  const directives = {
    defaultSrc: ["'self'"],

    scriptSrc: [
      "'self'",
      dev ? "'unsafe-eval'" : `'nonce-${nonce}'`,
      "https://web.squarecdn.com",
      "https://js.squareup.com",
      "https://www.google.com",
      "https://www.gstatic.com",
      "https://static.cloudflareinsights.com",
      "https://challenges.cloudflare.com",
      "https://sandbox.web.squarecdn.com",
    ],

    // Strict for attributes & CSSOM
    styleSrc: [
      "'self'",
      `'nonce-${nonce}'`,
      "https://fonts.googleapis.com",
      "https://web.squarecdn.com",
      "https://sandbox.web.squarecdn.com",
      "https://www.gstatic.com",
    ],

    // Allow inline <style> elements (needed for Next/Square/reCAPTCHA injected styles)
    styleSrcElem: [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://web.squarecdn.com",
      "https://sandbox.web.squarecdn.com",
      "https://www.gstatic.com",
    ],

    imgSrc: [
      "'self'",
      "data:",
      "blob:",
      "https://*.squarecdn.com",
      "https://web.squarecdn.com",
      "https://www.google.com",
      "https://www.gstatic.com",
      "https://static.cloudflareinsights.com",
    ],
    fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
    frameSrc: [
      "'self'",
      "https://web.squarecdn.com",
      "https://pci-connect.squareup.com",
      "https://js.squareup.com",
      "https://sandbox.web.squarecdn.com",
      "https://www.google.com",
      "https://recaptcha.google.com",
      "https://challenges.cloudflare.com",
    ],
    connectSrc: [
      "'self'",
      "https://ultrawaveinteractive.com",
      "https://connect.squareup.com",
      "https://pci-connect.squareup.com",
      "https://web.squarecdn.com",
      "https://sandbox.web.squarecdn.com",
      "https://*.squareupsandbox.com",
      "https://www.google.com",
      "https://www.gstatic.com",
      "https://static.cloudflareinsights.com",
    ],
    workerSrc: ["'self'", "blob:"],
    mediaSrc: ["'self'", "data:", "blob:"],
    manifestSrc: ["'self'"],
    formAction: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: [],
    baseUri: ["'self'"],
  };

  helmet({
    noSniff: true,
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer-when-downgrade" },
    permittedCrossDomainPolicies: true,
    contentSecurityPolicy: { useDefaults: true, directives },
  })(req, res, next);
});

  // CSP report endpoint
  // app.post("/csp-violation-report", express.json(), (req, res) => {
  //   //console.log("CSP Violation Report:", JSON.stringify(req.body, null, 2));
  //   res.status(204).end();
  // });

  // Body parsers
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Redis
  const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

  //oauth2client

  // 🧩 You can attach redis or oAuth2Client to app.locals if needed:
  // app.locals.redis = redis;
  // app.locals.oAuth2Client = oAuth2Client;

  // 🧩 Add route registration below or in separate route files
  // app.use('/userinfo', userinfoRoutes);


  // app.use((req, res, next) => {
  //   res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  //   res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  //   next();
  // });

  // 6️⃣ Rate limiter: Apply rate limiting to specific routes (optional but good)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit each IP to 15 requests per window
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again later.',
  });

  // BEFORE PUTTING IN PRODUCTION UNCOMMENT THESE LINES ABOUT RATE LIMITER
  //Apply rate limiting to sensitive routes
  app.use('/process-payment', apiLimiter);
  //app.use('/validate-token', apiLimiter);
  app.use('/send-otp', apiLimiter);
  app.use('/verify-otp', apiLimiter);
  app.use('/contact', apiLimiter);
  app.use('/verify-recaptcha', apiLimiter);

  // Initialize Square client
  const squareClient = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN, // Securely stored in .env file
    environment: Environment.Sandbox, // Use Environment.Production for live
  });

  // app.post("/send-otp", async (req, res) => {
  //   const { email } = req.body;

  //   if (!email) {
  //     console.error("❌ Missing email in request body");
  //     return res.status(400).json({ error: "Missing email" });
  //   }

  //   try {
  //     // 1️⃣ Check if user exists
  //     const user = await prisma.user.findUnique({ where: { email } });
  //     if (!user) {
  //       console.error(`❌ No user found for email ${email}`);
  //       return res.status(404).json({ error: "User not found" });
  //     }

  //     // 2️⃣ Generate a 6-digit OTP
  //     const otp = Math.floor(100000 + Math.random() * 900000).toString();

  //     // 3️⃣ Store OTP in Redis (10 minute TTL)
  //     const redis = await connectRedis();
  //     await redis.set(`otp:${email}`, otp, "EX", 600);
  //     console.log(`✅ OTP stored in Redis for ${email}`);

  //     // 4️⃣ Create basic SMTP transporter (no OAuth2)
  //     const transporter = nodemailer.createTransport({
  //       service: "gmail",
  //       auth: {
  //         user: process.env.EMAIL_USER,
  //         pass: process.env.EMAIL_PASS,
  //       },
  //     });

  //     // 5️⃣ Send email
  //     await transporter.sendMail({
  //       from: process.env.EMAIL_USER,
  //       to: email,
  //       subject: "Your One-Time Password (OTP)",
  //       text: `Your OTP is: ${otp}. It is valid for 10 minutes.`,
  //     });

  //     console.log(`✅ OTP email sent to ${email}`);
  //     return res.status(200).json({ message: "OTP sent successfully" });
  //   } catch (err) {
  //     console.error("❌ General send-otp error:", err);
  //     return res.status(500).json({ error: "Failed to send OTP" });
  //   }
  // });

  // app.post("/verify-otp", async (req, res) => {
  //   const { email, otp } = req.body;

  //   if (!email || !otp) {
  //     console.error("Missing email or otp", { email, otp });
  //     return res.status(400).json({ message: "Email and OTP are required" });
  //   }

  //   try {
  //     const redis = await connectRedis();
  //     const storedOtp = await redis.get(`otp:${email}`);
  //     console.log("Incoming OTP verification request:", { email, otp });
  //     console.log("Expected OTP from store:", storedOtp);

  //     if (!storedOtp) {
  //       console.error(`No OTP in Redis for ${email}`);
  //       return res.status(400).json({ message: "Invalid OTP" });
  //     }

  //     if (storedOtp.trim() === otp.trim()) {
  //       await redis.del(`otp:${email}`);

  //       // ✅ DB UPDATE HERE
  //       await prisma.user.update({
  //         where: { email },
  //         data: { otpVerified: true },
  //       });

  //       console.log(`OTP verified and user updated: ${email}`);
  //       return res.status(200).json({ message: "OTP verified successfully" });
  //     } else {
  //       console.error(`Stored OTP did not match for ${email}`, { storedOtp, otp });
  //       return res.status(400).json({ message: "Invalid OTP" });
  //     }
  //   } catch (error) {
  //     console.error("Error verifying OTP:", error);
  //     return res.status(500).json({ message: "Failed to verify OTP" });
  //   }
  // });

  // Zod schema for payment validation
  const paymentSchema = z.object({
    googleProviderId: z.string().min(1, "Google Provider ID is required"), // Must be a non-empty string
    email: z.string().email("Invalid email format"), // Standard email validation
    nonce: z.string().min(1, "Nonce is required"), // Nonce must be present
    amount: z.number().positive("Amount must be greater than 0"), // Positive number validation
  });

  // Middleware to validate the payment request body
  const validatePaymentRequest = (req, res, next) => {
    const { googleProviderId, email, receiptEmail, nonce, amount } = req.body;

    if (!googleProviderId || !email || !receiptEmail || !nonce || !amount) {
      console.error('Missing required fields in the request body');
      res.status(400).json({ error: 'Missing required fields in the request body' });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      console.error('Invalid amount');
      res.status(400).json({ error: 'Invalid amount. Amount must be a positive number.' });
    }

    // Attach validated data to the request object
    req.validatedData = { googleProviderId, email, receiptEmail, nonce, amount };
    next();
    };

    app.post('/process-payment', validatePaymentRequest, async (req, res) => {
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

  // Handle CSRF errors explicitly
  app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
      console.error('Invalid CSRF Token:', err);
      res.status(403).json({ error: 'Invalid CSRF token' });
    }
    next(err);
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).send('Something went wrong');
  });
}

module.exports = { initBackend };