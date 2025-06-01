import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Client, Environment } from 'square';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fetch from 'node-fetch';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';
import { z } from 'zod';
import Redis from "ioredis";
import nodemailer from 'nodemailer';
import { google } from "googleapis";
import helmet from 'helmet';
import { logger } from './config/logger.ts';

// ⬇️ Exported setup function
export default function initBackend(app) {
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

  // Helmet security headers
  app.use(helmet());
  app.use(helmet.noSniff());
  app.use(helmet.frameguard({ action: "deny" }));
  app.use(helmet.xssFilter());
  app.use(helmet.referrerPolicy({ policy: "no-referrer-when-downgrade" }));
  app.use(helmet.permittedCrossDomainPolicies());

  // Custom headers
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    next();
  });

  // CSP
  const isDev = process.env.NODE_ENV === 'development';

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          ...(isDev ? ["'unsafe-eval'"] : []),
          "'unsafe-inline'",
          "https://js.squareup.com",
          "https://sandbox.web.squarecdn.com", // ✅ Add this line
          "https://www.google.com",
          "https://www.gstatic.com",
          "https://cdn.sentry.io",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Square's card styles
          "https://js.squareup.com",
          "https://sandbox.web.squarecdn.com",
        ],
        frameSrc: [
          "'self'",
          "https://js.squareup.com",
          "https://sandbox.web.squarecdn.com",
          "https://accounts.google.com",
          "https://www.google.com",
          "https://www.gstatic.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://*.squarecdn.com",
          "https://accounts.google.com",
          "https://www.googleapis.com",
        ],
        connectSrc: [
          "'self'",
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "https://connect.squareup.com",
          "https://*.squareupsandbox.com",
          "https://sandbox.web.squarecdn.com",
          "https://oauth2.googleapis.com",
          "https://accounts.google.com",
          "https://smtp.gmail.com",
          "https://www.google.com",
          "https://www.gstatic.com",
          "https://cdn.sentry.io",
        ],
        objectSrc: ["'none'"],
      },
      reportOnly: false,
    },
  })
);

  // CSP report endpoint
  app.post("/csp-violation-report", express.json(), (req, res) => {
    //console.log("CSP Violation Report:", JSON.stringify(req.body, null, 2));
    res.status(204).end();
  });

  // Body parsers
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Redis
  const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

  // Google OAuth
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

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
  //console.log("ID Token received for validation:", token);

  try {
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID, // Replace with your client ID
    });

    const payload = ticket.getPayload();
    req.user = payload; // Attach user info to the request object for downstream use
    next();
  } catch (error) {
    console.error("ID Token validation failed:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid or expired ID token" });
  }
}

// Function to create a Nodemailer transporter with OAuth2
async function createTransporter() {
  try {
    //console.log("Requesting Access Token with the following credentials:");
    //console.log("Client ID:", process.env.GOOGLE_CLIENT_ID);
    //console.log("Client Secret:", process.env.GOOGLE_CLIENT_SECRET ? "Present" : "Missing");
    //console.log("Refresh Token:", process.env.GOOGLE_REFRESH_TOKEN);

    const accessToken = await oAuth2Client.getAccessToken();

    //console.log("Access Token retrieved:", accessToken.token);

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken.token || "no-access-token",
        
      },
      debug: true, // Enable debug logs
      logger: false, // Log to console
    });
  } catch (error) {
    console.error("Error in createTransporter:", error.response?.data || error.message);
    throw error;
  }
}

// Endpoint to send OTP
app.post("/send-otp", validateIdToken, async (req, res) => {
  const { email } = req.body;

  //console.log('send-otp endpoint is running');

  if (!email) {
    res.status(400).json({ message: "Email is required" });
  }

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP in Redis with a TTL (e.g., 10 minutes)
  try {
    //console.log('before setting otp in redis');
    await redis.set(`otp:${email}`, otp, "EX", 600); // Key: `otp:<email>`, Expires in 10 minutes
    //console.log('after setting otp in redis');
  } catch (error) {
    console.error("Error storing OTP in Redis:", error);
    res.status(500).json({ message: "Failed to store OTP" });
  }

  try {
    const transporter = await createTransporter();

    transporter.verify((error, success) => {
      if (error) {
        console.error("SMTP verification failed:", error);
      } else {
        //console.log("SMTP verification successful:", success);
      }
    });
    
    //console.log('before mail options');
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your One-Time Password (OTP)",
      text: `Your OTP is: ${otp}. It is valid for 10 minutes.`,
    };
    //console.log('before sendMail');
    await transporter.sendMail(mailOptions);
    logger.info(`OTP sent to ${email}`);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP", error: error || "Unknown error" });
  }
});

// Endpoint to verify OTP
app.post("/verify-otp", validateIdToken, async (req, res) => {
  const { email, otp } = req.body;

  //console.log('verify-otp endpoint is running');

  if (!email || !otp) {
    res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    // Retrieve OTP from Redis
    //console.log('before await redis.get()');
    const storedOtp = await redis.get(`otp:${email}`);
    //console.log('after await redis.get()');
    if (storedOtp === otp) {
      // OTP is valid; delete it from Redis to prevent reuse
      await redis.del(`otp:${email}`);
      //console.log(`OTP verified for ${email}`);
      res.status(200).json({ message: "OTP verified successfully" });
    } else {
      console.error(`Invalid OTP for ${email}`);
      res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Failed to verify OTP" });
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

app.post("/verify-recaptcha", validateIdToken, async (req: any, res: any) => {
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

// Start the server - don't want to call listen here
// app.listen(process.env.PORT, () => {
//   console.log(`Server is running on http://localhost:${process.env.PORT}`);
// });

}