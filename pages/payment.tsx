import React, { useEffect, useState } from 'react';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import { useRouter} from "next/router";

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

const Payment = ({ session }: { session: any }) => {
  console.log("Session prop received by Payment page:", session);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);

  useEffect(() => {
    // Extract the token from the query parameters
    const token = router.query.token as string;

    if (!token) {
      // If no token is provided, redirect the user back to the home page
      alert("You must log in first.");
      router.push("/");
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    // Send the token to the backend for validation
    //fetch(`${backendUrl}/validate-token`, {
    fetch('http://localhost:5000/validate-token', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken: token }), // Send the token to the backend
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIsAuthenticated(true); // Mark user as authenticated
        } else {
          alert("Authentication failed. Please log in again.");
          router.push("/");
        }
      })
      .catch(() => {
        alert("Authentication error. Please log in again.");
        router.push("/");
      });
  }, [router]);

  // If the user is not authenticated, don't render the payment page
  if (!isAuthenticated) return null;

  const handlePayment = async (token: any, verifiedBuyer: any) => {
    try {
      // Check session and user
      if (!session || !session.user) {
        console.error('Session or session.user is undefined');
        alert('You must be logged in to make a payment');
        return;
      }
  
      console.log('session.user.id:', session.user.id);
      console.log('session.user.email:', session.user.email);
      console.log('Token:', token);
      console.log('Amount in cents:', parseInt(amount) * 100);
  
      const response = await fetch('http://localhost:5000/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleProviderId: session.user.id,
          email: session.user.email,
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
      console.error('Payment error:', error);
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
        applicationId={process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || "missing-application-id"}
        locationId={process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "missing-location-id"}
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

export default Payment;
