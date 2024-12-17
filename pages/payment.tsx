import React, { useEffect, useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import { useRouter} from "next/router";
import { getSession } from "next-auth/react";

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

const validateToken = async (token: string, backendUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(`${backendUrl}/validate-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken: token }),
    });

    if (response.status === 429) {
      alert('Too many requests! Please try again later.');
      return false; // Handle the rate-limiting scenario
    }

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data: ValidateTokenResponse = await response.json();

    return data.success; // Return success status
  } catch (error) {
    console.error("Authentication error:", error);
    return false;
  }
};

const Payment = ({ session }: { session: any }) => {
  if (!session || !session.user) {
    console.error("Session or session.user is missing");
    return <p>You must be logged in to make a payment</p>;
  }
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const authenticateUser = async () => {
      const token = router.query.token as string;

      if (!token) {
        alert("You must log in first.");
        router.push("/");
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      const isValid = await validateToken(token, backendUrl || "");

      if (isValid) {
        setIsAuthenticated(true);
      } else {
        alert("Authentication failed. Please log in again.");
        router.push("/");
      }
    };

    authenticateUser();
  }, [router]);

  // If the user is not authenticated, don't render the payment page
  if (!isAuthenticated) return null;

  const handlePayment = async (token: any, verifiedBuyer: any) => {
    try {
      if (!session || !session.user) {
        console.error('Session or session.user is undefined');
        alert('You must be logged in to make a payment');
        return;
      }
  
      // console.log('session.user.id:', session.user.id);
      // console.log('session.user.email:', session.user.email);
      // console.log('Token:', token);
      // console.log('token.token: ',token.token);
      // console.log('Amount in cents:', parseInt(amount) * 100);
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      if (recaptchaRef.current) {
        const token = recaptchaRef.current.getValue();
        if (!token) {
          setMessage("Please complete the reCAPTCHA.");
          return;
        }
  
        try {
          const response = await fetch(`${backendUrl}/verify-recaptcha`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
  
          const data = await response.json();
          if (data.success) {
            setMessage("reCAPTCHA verified successfully!");
          } else {
            setMessage("reCAPTCHA verification failed.");
          }
        } catch (err) {
          setMessage("An error occurred while verifying.");
        }
      }

      const response = await fetch(`${backendUrl}/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleProviderId: session.user.id,
          email: session.user.email,
          receiptEmail: customerEmail,
          nonce: token.token,
          amount: parseInt(amount) * 100, // Convert dollars to cents
        }),
      });

      if (response.status === 429) {
        alert('Too many requests! Please try again later.');
        return; // Handle the rate-limiting scenario
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
      console.error('error:', error);
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
        cardTokenizeResponseReceived={handlePayment}
      >
        <input required type="email" id="customerEmail" name="customerEmail" onChange={(e) => setCustomerEmail(e.target.value)} 
        placeholder='Enter your email for your receipt'></input>
        <CreditCard />
        <button disabled={!amount} type="submit">
          Pay ${amount || 0}
        </button>
      </PaymentForm>
    </div>
  );
};

export async function getServerSideProps(context: any) {
  // Fetch the session on the server side
  const session = await getSession(context);

  //console.log("Session fetched in getServerSideProps:", session);

  // If there is no session, redirect to the sign-in page
  if (!session) {
    return {
      redirect: {
        destination: "/api/auth/signin", // Redirect to login page
        permanent: false,
      },
    };
  }

  // Pass the session as a prop to the page
  return {
    props: { session },
  };
}

export default Payment;
