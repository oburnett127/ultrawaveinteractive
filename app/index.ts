// Import required modules
import express from 'express';
import cors from 'cors';
import { Client, Environment }  from 'square';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

const corsOptions = {
  origin: 'http://localhost:3000',
};

app.use(cors(corsOptions));
const PORT = process.env.PORT || 5000;

// Configure middleware
app.use(express.json()); // Parse JSON bodies

//app.use('/auth', authRoutes);

// Initialize Square client
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN, // Securely stored in .env file
  environment: Environment.Production, // Use Environment.Production for live
});

// Define routes

// Health check route
app.get('/', (req: any, res: any) => {
  res.send('Square integration backend is running!');
});

app.post('/process-payment', async (req: any, res: any) => {
  const { googleProviderId, email, nonce, amount } = req.body;

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
      console.error(error.message);
      res.status(500).json({ error: error.message });
    } else {
      console.error('An unknown error occurred', error);
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
