// Import required modules
import express from 'express';
import cors from 'cors';
import { Client, Environment } from 'square';
import dotenv from 'dotenv';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import jwkToPem from 'jwk-to-pem';

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

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

const corsOptions = {
  origin: 'http://localhost:3000', // Allow requests from your frontend
};

app.use(cors(corsOptions));
const PORT = process.env.PORT || 5000;

// Configure middleware
app.use(express.json()); // Parse JSON bodies

// Initialize Square client
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN, // Securely stored in .env file
  environment: Environment.Production, // Use Environment.Production for live
});

// URL to fetch Google's public keys
const GOOGLE_PUBLIC_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";

const getGooglePublicKeys = async (): Promise<GooglePublicKey[]> => {
  const response = await fetch(GOOGLE_PUBLIC_KEYS_URL);

  if (!response.ok) {
    throw new Error("Failed to fetch Google public keys");
  }

  // Use explicit typing for the JSON response
  const data: GooglePublicKeysResponse = (await response.json()) as GooglePublicKeysResponse;

  return data.keys;
};

const validateIdToken = async (idToken: string) => {
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
    kty: "RSA", // Ensure this is explicitly typed as "RSA"
  };

  // Convert the key from JWK to PEM format
  const pem = jwkToPem(enhancedKey);

  // Verify the token using the PEM public key
  const verifiedPayload = jwt.verify(idToken, pem, { algorithms: ["RS256"] });
  return verifiedPayload;
};


// Define routes

// // Health check route
// app.get('/', (req, res) => {
//   res.send('Square integration backend is running!');
// });

// Payment processing route
app.post('/process-payment', async (req, res) => {
  const { googleProviderId, email, nonce, amount } = req.body;

  console.log(googleProviderId);
  console.log(email);
  console.log(nonce);
  console.log(amount);

  try {
    // Create a unique idempotency key
    const idempotencyKey = crypto.randomUUID();

    // Ensure the amount is converted to BigInt
    const amountInCents = BigInt(amount); // Converts the amount to BigInt

    // Create payment request
    const paymentResponse = await squareClient.paymentsApi.createPayment({
      sourceId: nonce, // The payment token from the frontend
      idempotencyKey, // Ensures no duplicate payments
      amountMoney: {
        amount: amountInCents, // Amount in cents as BigInt
        currency: 'USD', // Replace with your preferred currency
      },
       referenceId: googleProviderId,
       note: `Payment by user: ${email}`,
    });

    // Convert BigInt values in the response to strings
    const sanitizedResponse = JSON.parse(
      JSON.stringify(paymentResponse.result, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    // Respond with success
    res.status(200).json(sanitizedResponse);
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      console.log('error is occuring: ', error.message);
      console.error(error.message);
      res.status(500).json({ error: error.message });
    } else {
      console.log('An unknown error occurred', error);
      console.error('An unknown error occurred', error);
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

// Token validation route
app.post('/validate-token', async (req, res) => {
  console.log('Route hit: /validate-token');
  console.log('Request body:', req.body);
  
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "ID token is required" });
  }

  try {
    res.set('Cross-Origin-Opener-Policy', 'unsafe-none');
    const user = await validateIdToken(idToken);
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
