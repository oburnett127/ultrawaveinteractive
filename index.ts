// Import required modules
import express, { Request, Response, RequestHandler, NextFunction } from 'express';
import cors from 'cors';
import { Client, Environment } from 'square';
import dotenv from 'dotenv';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import jwkToPem from 'jwk-to-pem';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';
import { z } from 'zod';
import csrf from 'csurf';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import getGooglePublicKeys from "./getGooglePublicKeys"; // Assumes a function that fetches Google's public keys
import { generateOTP, storeOTP, validateOTP, deleteOTP } from './otp';
import { sendOTPEmail } from './email';

interface GooglePublicKey {
  kid: string; // key ID
  alg: string; // algorithm
  use: string; // usage
  n: string;   // modulus
  e: string;   // exponent
}

interface GooglePublicKeysResponse {
  keys: GooglePublicKey[];
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS
const corsOptions = {
  origin: 'http://localhost:3000', // Allow requests from your frontend
  credentials: true,
};
app.use(cors(corsOptions));

// Configure Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later.',
});

// Apply rate limiting to specific routes
app.use('/process-payment', apiLimiter);
app.use('/validate-token', apiLimiter);
app.use('/send-otp', apiLimiter);

// Cookie parser middleware
app.use(cookieParser());

// Session middleware (required for CSRF tokens)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret-key-not-found',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true, // Prevent JavaScript from accessing cookies
    },
  })
);

// Body parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CSRF middleware (use cookie-based tokens)
const csrfProtection = csrf({ cookie: true }) as unknown as RequestHandler;

// CSRF token endpoint
app.get('/csrf-token', csrfProtection, (req: Request, res: Response) => {
  try {
    console.log('CSRF Token Request Received'); // Log when the route is hit

    const csrfToken = req.csrfToken(); // Generate the CSRF token
    console.log('Generated CSRF Token:', csrfToken); // Log the generated token

    res.json({ csrfToken }); // Respond with the token
  } catch (error) {
    console.error('Error generating CSRF token:', error); // Log any errors
    res.status(500).json({ error: 'Failed to generate CSRF token' }); // Respond with a 500 error
  }
});

// Initialize Square client
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN, // Securely stored in .env file
  environment: Environment.Sandbox, // Use Environment.Production for live
});

const validateIdToken = async (idToken: string) => {
  try {
    const publicKeys = await getGooglePublicKeys();

    // Decode the token header to get the "kid"
    const decodedHeader = jwt.decode(idToken, { complete: true }) as { header: { kid: string } } | null;

    if (!decodedHeader || !decodedHeader.header.kid) {
      throw new Error("Invalid token header");
    }

    const key = publicKeys.find((k) => k.kid === decodedHeader.header.kid);
    if (!key) {
      throw new Error("Invalid token key");
    }

    // Add the missing 'kty' field and ensure the type matches 'RSA'
    const enhancedKey: { kty: "RSA"; kid: string; alg: string; use: string; n: string; e: string } = {
      ...key,
      kty: "RSA",
    };

    // Convert the key from JWK to PEM format
    const pem = jwkToPem(enhancedKey);

    // Verify the token using the PEM public key
    const verifiedPayload = jwt.verify(idToken, pem, { algorithms: ["RS256"] }) as {
      aud: string;
      exp: number;
      iss: string;
      sub: string;
      email: string;
      email_verified?: boolean;
    };

    // Validate audience
    if (verifiedPayload.aud !== process.env.GOOGLE_CLIENT_ID) {
      throw new Error("Invalid audience in token");
    }

    // Validate expiration
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    if (verifiedPayload.exp < currentTime) {
      throw new Error("Token has expired");
    }

    // Validate issuer
    if (verifiedPayload.iss !== "accounts.google.com" && verifiedPayload.iss !== "https://accounts.google.com") {
      throw new Error("Invalid token issuer");
    }

    // Ensure required claims are present
    if (!verifiedPayload.sub) {
      throw new Error("Token is missing subject (sub)");
    }
    if (!verifiedPayload.email) {
      throw new Error("Token is missing email");
    }

    // Optional: Enforce email verification
    if (!verifiedPayload.email_verified) {
      throw new Error("Email is not verified");
    }

    // Return the verified payload
    return verifiedPayload;
  } catch (error: any) {
    console.error("An error occurred during token validation:", error.message || error);
    throw new Error("Failed to validate token");
  }
};

app.post('/validate-token', csrfProtection, async (req: Request, res: Response) => {
  try {
    // Log incoming CSRF token for debugging
    const csrfTokenFromHeader = req.headers['csrf-token'];
    console.log('CSRF Token from Header:', csrfTokenFromHeader);

    // Extract the ID token from the request body
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Missing ID token' });
    }

    console.log('ID Token Received:', idToken);

    // Validate the ID token
    const verifiedPayload = await validateIdToken(idToken);

    // If validation succeeds, return success
    console.log('Token is valid. Verified Payload:', verifiedPayload);
    return res.json({ success: true, payload: verifiedPayload });

  } catch (error: any) {
    console.error('Error validating ID token:', error.message);
    return res.status(401).json({ error: 'Invalid ID token' });
  }
});

// Zod schema for payment validation
const paymentSchema = z.object({
  googleProviderId: z.string().min(1, "Google Provider ID is required"), // Must be a non-empty string
  email: z.string().email("Invalid email format"), // Standard email validation
  nonce: z.string().min(1, "Nonce is required"), // Nonce must be present
  amount: z.number().positive("Amount must be greater than 0"), // Positive number validation
});

// Payment processing route
// Middleware to validate the payment request body
const validatePaymentRequest = (req: Request, res: Response, next: Function) => {
  const { googleProviderId, email, receiptEmail, nonce, amount } = req.body;

  if (!googleProviderId || !email || !receiptEmail || !nonce || !amount) {
    console.error('Missing required fields in the request body');
    return res.status(400).json({ error: 'Missing required fields in the request body' });
  }

  // Validate amount
  if (typeof amount !== 'number' || amount <= 0) {
    console.error('Invalid amount');
    return res.status(400).json({ error: 'Invalid amount. Amount must be a positive number.' });
  }

  // Attach validated data to the request object
  req.validatedData = { googleProviderId, email, receiptEmail, nonce, amount };
  next();
};

app.post('/process-payment', csrfProtection, validatePaymentRequest, async (req: Request, res: Response) => {
  try {
    const { googleProviderId, email, receiptEmail, nonce, amount } = req.validatedData;

    // Convert the amount to cents (ensure it's a valid BigInt for Square)
    const amountInCents = BigInt(amount);

    // Create a unique idempotency key
    const idempotencyKey = crypto.randomUUID();

    console.log('Processing payment with the following details:');
    console.log({
      googleProviderId,
      email,
      receiptEmail,
      nonce,
      amount: amountInCents.toString(),
      idempotencyKey,
    });

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

    console.log('Payment response from Square:', paymentResponse);

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
  } catch (error: any) {
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

app.post('/send-otp', csrfProtection, async (req: Request, res: Response) => {
  if (req.method === 'POST') {
    const { email } = req.body;

    const otp = generateOTP(); // Generate a 6-digit OTP
    await storeOTP(email, otp); // Store it in Redis
    await sendOTPEmail(email, otp); // Send the OTP via email

    res.status(200).json({ message: 'OTP sent successfully' });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
});

const secret = process.env.NEXTAUTH_SECRET; // Use the same secret from your NextAuth configuration

export function verifyToken(token: string) {
  try {
    // Verify and decode the JWT
    const decodedToken = jwt.verify(token, secret as any) as any;
    return decodedToken; // Contains the user's data (e.g., email, otpVerified, etc.)
  } catch (err) {
    console.error("Invalid or expired token:", err);
    return null; // Token is invalid
  }
}
app.post('/verify-otp', csrfProtection, async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || ""; // Example: "Bearer <token>"
  const token = authHeader.split(" ")[1]; // Extract the token from the "Authorization" header

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const decodedToken = verifyToken(token);

  if (!decodedToken) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }

  // Use the decoded data (e.g., check if OTP is verified)
  if (!decodedToken.otpVerified) {
    return res.status(403).json({ message: "OTP verification required" });
  }

  // Continue with your logic (e.g., return user data or allow access)
  res.status(200).json({ message: "Access granted" });
});

// Handle CSRF errors explicitly
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.error('Invalid CSRF Token:', err);
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next(err);
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled Error:', err);
  res.status(500).send('Something went wrong');
});

app.post("/verify-recaptcha", async (req, res) => {
  const { token } = req.body;

  // Check if the token exists
  if (!token) {
    return res.status(400).json({ success: false, message: "Token is missing." });
  }

  try {
    // reCAPTCHA secret key
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    // Google's reCAPTCHA verification URL
    const verificationURL = "https://www.google.com/recaptcha/api/siteverify";

    // Make a POST request to Google for verification
    const response = await fetch(verificationURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey || "secret-key-not-found",
        response: token,
      }).toString(),
    });

    // Parse the response from Google
    const data: any = await response.json();

    if (data.success) {
      return res.status(200).json({ success: true, message: "reCAPTCHA verification successful." });
    } else {
      console.error("reCAPTCHA verification failed:", data["error-codes"]);
      return res.status(400).json({
        success: false,
        message: "reCAPTCHA verification failed.",
        errors: data["error-codes"],
      });
    }
  } catch (error: any) {
    console.error("Error verifying reCAPTCHA:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred during reCAPTCHA verification.",
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
