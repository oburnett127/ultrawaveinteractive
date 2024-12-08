// Import required modules
const express = require('express');
const cors = require('cors');
const { Client, Environment } = require('square');
const dotenv = require('dotenv');
const crypto = require('crypto');

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

// Initialize Square client
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN, // Securely stored in .env file
  environment: Environment.Production, // Use Environment.Production for live
});

// Define routes

// Health check route
app.get('/', (req, res) => {
  res.send('Square integration backend is running!');
});

app.post('/process-payment', async (req, res) => {
  const { nonce, amount } = req.body;

  try {
    // Create a unique idempotency key
    const idempotencyKey = crypto.randomUUID();

    // Create payment request
    const paymentResponse = await squareClient.paymentsApi.createPayment({
      sourceId: nonce, // The payment token from the frontend
      idempotencyKey, // Ensures no duplicate payments
      amountMoney: {
        amount: Number(amount), // Amount in cents (e.g., 500 = $5.00)
        currency: 'USD', // Replace with your preferred currency
      },
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
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
