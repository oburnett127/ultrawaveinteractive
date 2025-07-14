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
const  connectRedis = require('./lib/redis.js');
const prisma = require("./lib/prisma.cjs"); 

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

  app.use(
    helmet({
      noSniff: true,
      frameguard: { action: "deny" },
      xssFilter: true,
      referrerPolicy: { policy: "no-referrer-when-downgrade" },
      permittedCrossDomainPolicies: true,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],

          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://ultrawaveinteractive.com',
            // Square sandbox & prod
            'https://sandbox.web.squarecdn.com',
            'https://web.squarecdn.com',       // For prod later
            'https://js.squareup.com',
            // Google
            'https://www.google.com',
            'https://www.gstatic.com',
            // Your other services
            'https://cdn.sentry.io',
            'https://consent.cookiebot.com',
          ],

          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required by Square and Cookiebot
            "https://consent.cookiebot.com",
            "https://js.squareup.com",
            "https://sandbox.web.squarecdn.com",
            "https://fonts.googleapis.com",
          ],

          imgSrc: [
            "'self'",
            "data:",
            "https://*.squarecdn.com",
            "https://consent.cookiebot.com",
            "https://accounts.google.com",
            "https://www.googleapis.com",
            "https://www.google.com",
            "https://www.gstatic.com",
            "https://authjs.dev",
          ],

          frameSrc: [
            "'self'",
            // Square sandbox iframe endpoints
            'https://sandbox.web.squarecdn.com',
            'https://pci-connect.squareup.com',
            // Square prod iframe domains (for future)
            'https://web.squarecdn.com',
            'https://js.squareup.com',
            // Google login
            'https://accounts.google.com',
            'https://www.google.com',
            'https://www.gstatic.com',
            // Cookiebot
            'https://consent.cookiebot.com',
          ],

          connectSrc: [
             "'self'",
            'https://ultrawaveinteractive.com',
            'http://localhost:8080',           // or your actual dev port
            'http://127.0.0.1:8080',

            // Square sandbox
            'https://sandbox.web.squarecdn.com',
            'https://*.squareupsandbox.com',
            'https://pci-connect.squareup.com',

            // Square prod (future)
            'https://connect.squareup.com',
            'https://web.squarecdn.com',

            // Google login
            'https://oauth2.googleapis.com',
            'https://accounts.google.com',
            'https://www.google.com',
            'https://www.gstatic.com',

            // SMTP and error tracking
            'https://smtp.gmail.com',
            'https://cdn.sentry.io',
            'https://consent.cookiebot.com',
          ],

          objectSrc: ["'none'"],
        },
        reportOnly: false,
      },
    })
  );

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


  //For validating the jwt ID token for a user, not for validating access tokens, access
  //tokens are not jwt tokens and they do not need to be validated by this app.
  async function validateIdToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // ✅ Define OAuth2 client here (local to this middleware)
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    try {
      const ticket = await oAuth2Client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      req.user = payload; // Attach user info for downstream
      next();
    } catch (error) {
      console.error("❌ ID Token validation failed:", error.message);
      return res.status(401).json({ error: "Unauthorized: Invalid or expired ID token" });
    }
  }

  // Function to create a Nodemailer transporter with OAuth2
  async function createTransporter(oAuth2Client) {
    const accessTokenResponse = await oAuth2Client.getAccessToken();

    if (!accessTokenResponse?.token) {
      throw new Error("Failed to obtain access token");
    }

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: oAuth2Client.credentials.refresh_token,
        accessToken: accessTokenResponse.token,
      },
      debug: true,
      logger: false,
    });
  }

  app.post("/send-otp", validateIdToken, async (req, res) => {
    const { email } = req.body;

    if (!email) {
      console.error("❌ Missing email in request body");
      return res.status(400).json({ error: "Missing email" });
    }

    try {
      // 1️⃣ Get user refresh token from DB
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { refreshToken: true },
      });

      if (!dbUser?.refreshToken) {
        console.error(`❌ No refresh token found for user ${email}`);
        return res.status(500).json({ error: "No refresh token found for user" });
      }

      // 2️⃣ Setup Google OAuth2 client
      const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oAuth2Client.setCredentials({
        refresh_token: dbUser.refreshToken,
      });

      // 3️⃣ Generate a random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // 4️⃣ Store OTP in Redis (10 min TTL)
      try {
        const redis = await connectRedis();
        await redis.set(`otp:${email}`, otp, "EX", 600);
        console.log(`✅ OTP stored in Redis for ${email}`);
      } catch (redisErr) {
        console.error("❌ Error storing OTP in Redis:", redisErr);
        return res.status(500).json({ error: "Failed to store OTP" });
      }

      // 5️⃣ Create email transporter with access token
      let transporter;
      try {
        const accessTokenResponse = await oAuth2Client.getAccessToken();
        if (!accessTokenResponse.token) {
          throw new Error("Failed to get access token from Google");
        }

        transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            type: "OAuth2",
            user: process.env.EMAIL_USER,
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            refreshToken: dbUser.refreshToken,
            accessToken: accessTokenResponse.token,
          },
        });
      } catch (transporterErr) {
        console.error("❌ Error creating transporter:", transporterErr);
        return res.status(500).json({ error: "Failed to create email transporter" });
      }

      // 6️⃣ Send email
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Your One-Time Password (OTP)",
          text: `Your OTP is: ${otp}. It is valid for 10 minutes.`,
        });

        console.log(`✅ OTP email sent to ${email}`);
        return res.status(200).json({ message: "OTP sent successfully" });
      } catch (sendMailErr) {
        console.error("❌ Error sending OTP email:", sendMailErr);
        return res.status(500).json({ error: "Failed to send OTP email" });
      }
    } catch (err) {
      console.error("❌ General send-otp error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/verify-otp", validateIdToken, async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      console.error("Missing email or otp", { email, otp });
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    try {
      const redis = await connectRedis();
      const storedOtp = await redis.get(`otp:${email}`);
      console.log("Incoming OTP verification request:", { email, otp });
      console.log("Expected OTP from store:", storedOtp);

      if (!storedOtp) {
        console.error(`No OTP in Redis for ${email}`);
        return res.status(400).json({ message: "Invalid OTP" });
      }

      if (storedOtp.trim() === otp.trim()) {
        await redis.del(`otp:${email}`);
        console.log(`OTP verified for ${email}`);
        return res.status(200).json({ message: "OTP verified successfully" });
      } else {
        console.error(`Stored OTP did not match for ${email}`, { storedOtp, otp });
        return res.status(400).json({ message: "Invalid OTP" });
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

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

    app.post('/process-payment', validateIdToken, validatePaymentRequest, async (req, res) => {
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
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      // Destructure and sanitize input data
      const { formData, recaptchaToken } = req.body;

      if (!formData || !formData.firstName || !formData.lastName || !formData.email || !formData.message) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        return res.status(400).json({ error: "Invalid email address." });
      }

      // Verify reCAPTCHA token
      const response = await verifyRecaptchaToken(recaptchaToken);
      if (response.success === false) {
        return res.status(400).json({ error: "Failed reCAPTCHA verification" });
      }

      const transporter = await createTransporter();

      // Email details
      const mailOptions = {
        from: formData.email, // The user's email address
        to: process.env.EMAIL_USER, // Replace with your email address
        subject: "ALERT a customer has sent you a message!!!",
        text: `
          First Name: ${formData.firstName}
          Last Name: ${formData.lastName}
          Email: ${formData.email}
          Phone: ${formData.phone || "N/A"}
          Message: ${formData.message}
        `,
      };

      // Send email
      await transporter.sendMail(mailOptions);

      // Respond to the client
      res.status(200).json({ message: "Message sent successfully!" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send message. Please try again." });
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

  app.post("/verify-recaptcha", validateIdToken, async (req, res) => {
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