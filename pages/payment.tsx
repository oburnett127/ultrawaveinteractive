import React, { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import { useSession } from "next-auth/react";
import DOMPurify from 'dompurify';
import { getToken } from 'next-auth/jwt';

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

interface ValidateTokenResponse {
  success: boolean;
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

const Payment = () => {
  const { data: session, update, status } = useSession();

  if (!session || !session.user) {
    console.error("Session or session.user is missing");
    return <p>You must be logged in to make a payment</p>;
  }
  
  const [amount, setAmount] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [message, setMessage] = useState("");
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
  //MAKE SURE THE USER HAS BEEN AUTHENTICATED!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  const handlePayment = async (token: any, verifiedBuyer: any) => {
    try {
      if (!session || !session.user) {
        console.error('Session or session.user is undefined');
        alert('You must be logged in to make a payment');
        return;
      }
  
      const sanitizedAmountInCents = parseInt(DOMPurify.sanitize(amount)) * 100;
      const sanitizedReceiptEmail = DOMPurify.sanitize(customerEmail);
      const sanitizedEmail = DOMPurify.sanitize(session.user.email || "");

      // Make the payment request
      const response = await fetch(`${backendUrl}/process-payment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${session?.user.idToken}`,
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({
          googleProviderId: session.user.id,
          email: sanitizedEmail,
          receiptEmail: sanitizedReceiptEmail,
          nonce: token.token,
          amount: sanitizedAmountInCents,
        }),
      });
  
      if (response.status === 429) {
        alert('Too many requests! Please try again later.');
        return;
      }
  
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'An error occurred. Please try again.');
        return;
      }
  
      const data = await response.json();
      setPaymentDetails(data); // Save payment details to state
      alert('Payment successful!');
    } catch (error) {
      console.error('Error during payment:', error);
      alert('An error occurred. Please try again.');
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    if (id === "amount") {
      // Sanitize amount: allow only numbers and a maximum value
      const sanitizedValue = value.replace(/[^0-9.]/g, "");
      setAmount(sanitizedValue);
    } else if (id === "customerEmail") {
      // Sanitize email input
      const sanitizedEmail = DOMPurify.sanitize(value);
      setCustomerEmail(sanitizedEmail);
    }
  };

  return (
    <div>
      <h1>Payment Page</h1>
      <h2>Payment submission may take between 30 seconds to 1 minute</h2>
      {!paymentDetails ? (
        <form>
          <div>
            <label htmlFor="amount">Payment Amount (USD):</label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={handleInputChange}
              placeholder="Enter amount"
              min="1"
              step="0.01"
              required
            />
            <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY || "site-key-not-found"} />
            <p>{message}</p>
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
          cardTokenizeResponseReceived={(token, verifiedBuyer) => {
            // Call handlePayment when the card tokenization is complete
            handlePayment(token, verifiedBuyer);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault(); // Prevent the default form submission behavior
              if (!amount) {
                alert("Please enter an amount to pay.");
                return;
              }
              if (!customerEmail) {
                alert("Please enter your email for the receipt.");
                return;
              }
              // Tokenization will trigger handlePayment
            }}
          >
            {/* Email Input */}
            <input
              required
              type="email"
              id="customerEmail"
              name="customerEmail"
              value={customerEmail}
              onChange={handleInputChange}
              placeholder="Enter your email for your receipt"
            />

            {/* Credit Card Input */}
            <CreditCard />

            {/* Payment Button */}
            <button
              type="submit"
              disabled={!amount} // Disable button if no amount
            >
              Pay ${amount || 0}
            </button>
          </form>
        </PaymentForm>
    </div>
  );
};

export async function getServerSideProps(context: any) {
  const token = await getToken({ req: context.req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.otpVerified) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return { props: {} }; // Session now reflects updated otpVerified state
}

export default Payment;
