import React, { useEffect, useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import { useRouter} from "next/router";
import { getSession } from "next-auth/react";
import DOMPurify from 'dompurify';

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
  const [queryToken, setQueryToken] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);


  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (router.query.token) {
      setQueryToken(router.query.token as string);
    }
  }, [router.query.token]);

  useEffect(() => {
    const fetchCsrfAndAuthenticate = async () => {
      try {
        const res = await fetch(`${backendUrl}/csrf-token`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch CSRF token');
        const data = await res.json();
  
        const csrfTokenValue = data.csrfToken;
        console.log('Fetched CSRF token:', csrfTokenValue);
  
        // Store CSRF token in state
        setCsrfToken(csrfTokenValue);
  
        // Authenticate user
        const token = router.query.token as string;
        if (!token) {
          alert('You must log in first.');
          router.push('/');
          return;
        }
  
        const isValid = await validateToken(token, backendUrl || "", csrfTokenValue);
        if (isValid) {
          setIsAuthenticated(true);
        } else {
          alert('Authentication failed. Please log in again.');
          router.push('/');
        }
      } catch (error) {
        console.error('Error during authentication:', error);
      }
    };
  
    fetchCsrfAndAuthenticate();
  }, [router.query.token, backendUrl]);
  

  const fetchCsrfToken = async (backendUrl: string): Promise<string> => {
    try {
      const res = await fetch(`${backendUrl}/csrf-token`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch CSRF token: ${res.status}`);
      const data = await res.json();
      console.log('Fetched CSRF token:', data.csrfToken);
      return data.csrfToken;
    } catch (error: any) {
      console.error('Error fetching CSRF token:', error.message);
      throw error; // Re-throw for the caller to handle
    }
  };

  const validateToken = async (token: string, backendUrl: string, csurfToken: string): Promise<boolean> => {
    try {
      const response = await fetch(`${backendUrl}/validate-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csurfToken,
        },
        credentials: "include", // Ensure cookies are sent
        body: JSON.stringify({ idToken: token }),
      });
  
      // Handle rate-limiting case
      if (response.status === 429) {
        alert('Too many requests! Please try again later.');
        throw new Error('Too many requests'); // Explicitly throw for rate-limiting
      }
  
      // Handle non-OK responses (like 403, 500, etc.)
      if (!response.ok) {
        const errorBody = await response.text(); // Log the response body for debugging
        console.error('Response status:', response.status);
        console.error('Response body:', errorBody);
        throw new Error(`Failed to validate token. Status: ${response.status}`);
      }
  
      // Parse and return the validation result
      const data: ValidateTokenResponse = await response.json();
      if (!data.success) {
        throw new Error('Token validation failed');
      }
  
      return true; // Validation succeeded
    } catch (error: any) {
      console.error("Error during token validation:", error.message);
      throw error; // Re-throw the error for the caller to handle
    }
  };

  // If the user is not authenticated, don't render the payment page
  if (!isAuthenticated) return null;

  const handlePayment = async (token: any, verifiedBuyer: any) => {
    try {
      if (!session || !session.user) {
        console.error('Session or session.user is undefined');
        alert('You must be logged in to make a payment');
        return;
      }
  
      // Ensure the CSRF token is available
      if (!csrfToken) {
        alert('CSRF token is missing. Please reload the page.');
        return;
      }
  
      const sanitizedAmountInCents = parseInt(DOMPurify.sanitize(amount)) * 100;
      const sanitizedReceiptEmail = DOMPurify.sanitize(customerEmail);
      const sanitizedEmail = DOMPurify.sanitize(session.user.email);


      // Make the payment request
      const response = await fetch(`${backendUrl}/process-payment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken, // Use CSRF token from state
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
              if (!csrfToken) {
                alert("CSRF token is missing. Please reload the page and try again.");
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
              disabled={!amount || !csrfToken} // Disable button if no amount or CSRF token
            >
              Pay ${amount || 0}
            </button>
          </form>
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
        destination: "/", // Redirect to login page
        permanent: false,
      },
    };
  }

  if (!session.user.otpVerified) {
    // Redirect to /verify-otp if OTP is not verified
    return {
      redirect: {
        destination: "/verify-otp",
        permanent: false,
      },
    };
  }

  // Pass the session as a prop to the page
  return {
    props: {},
  };
}

export default Payment;
