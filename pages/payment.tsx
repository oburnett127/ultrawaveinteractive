import React, { useState } from 'react';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';

// Define the type for payment details
interface PaymentDetails {
  payment: {
    id: string;
    amountMoney: {
      amount: number;
    };
    status: string;
    receiptUrl: string;
  };
}

const PaymentPage = () => {
  const [amount, setAmount] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);

  const handlePayment = async (token: any, verifiedBuyer: any) => {
    try {
      const response = await fetch('https://localhost:5000/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nonce: token.token,
          amount: parseInt(amount) * 100, // Convert dollars to cents
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'An error occurred. Please try again.');
        return;
      }

      const data = await response.json();
      setPaymentDetails(data); // Save payment details to state
      alert('Payment successful!');
    } catch (error) {
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div>
      <h1>Payment Page - Payment submission may take between 30 seconds to 1 minute</h1>
      {!paymentDetails ? (
        <form>
          <div>
            <label htmlFor="amount">Payment Amount (USD):</label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
        </form>
      ) : (
        <div>
          <h2>Payment Successful!</h2>
          <p>Transaction ID: {paymentDetails.payment.id}</p>
          <p>Amount Paid: ${paymentDetails.payment.amountMoney.amount / 100}</p>
          <p>Status: {paymentDetails.payment.status}</p>
          <a href={paymentDetails.payment.receiptUrl} target="_blank" rel="noopener noreferrer">
            View Receipt
          </a>
        </div>
      )}

      <PaymentForm
        applicationId={process.env.REACT_APP_SQUARE_APPLICATION_ID || "missing-application-id"}
        locationId={process.env.REACT_APP_SQUARE_LOCATION_ID || "missing-location-id"}
        cardTokenizeResponseReceived={handlePayment}
      >
        <CreditCard />
        <button disabled={!amount} type="submit">
          Pay ${amount || 0}
        </button>
      </PaymentForm>
    </div>
  );
};

export default PaymentPage;
