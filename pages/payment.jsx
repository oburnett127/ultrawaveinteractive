import React, { useState } from 'react';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import { useSession } from "next-auth/react";
import DOMPurify from 'dompurify';
import { getToken } from 'next-auth/jwt';

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

const Payment = () => {
  const { data: session } = useSession();

  const [amount, setAmount] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentDetails, setPaymentDetails] = useState(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

  const handleInputChange = (e => {
    const { id, value } = e.target;
    if (id === "amount") {
      const sanitized = value.replace(/[^0-9.]/g, "");
      setAmount(sanitized);
    } else if (id === "customerEmail") {
      setCustomerEmail(DOMPurify.sanitize(value));
    }
  })

  const handlePayment = async (token, verifiedBuyer) => {
    if (!session?.user) {
      alert("You must be logged in to make a payment.");
      return;
    }

    try {
      const sanitizedAmount = parseFloat(DOMPurify.sanitize(amount));
      const amountInCents = Math.round(sanitizedAmount * 100);
      const userEmail = DOMPurify.sanitize(session.user.email || "");
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/process-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.idToken}`,
        },
        credentials: "include",
        body: JSON.stringify({
          googleProviderId: session.user.id,
          email: userEmail,
          receiptEmail: customerEmail,
          nonce: token.token,
          amount: amountInCents,
        }),
      });

      if (response.status === 429) {
        alert("Too many requests. Please try again later.");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "An error occurred. Please try again.");
        return;
      }

      setPaymentDetails(data);
      alert("Payment successful!");
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("An error occurred. Please try again.");
    }
  };

  if (!session?.user) {
    return <p>You must be logged in to make a payment.</p>;
  }

  return (
    <div>
      <h1>Payment Page</h1>
      <h2>Payment submission may take 30 seconds to 1 minute</h2>

      {!paymentDetails ? (
        <>
          <form>
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

            <label htmlFor="customerEmail">Receipt Email:</label>
            <input
              type="email"
              id="customerEmail"
              value={customerEmail}
              onChange={handleInputChange}
              placeholder="Enter your email"
              required
            />
          </form>

          <PaymentForm
            applicationId={applicationId}
            locationId={locationId}
            cardTokenizeResponseReceived={(token, verifiedBuyer) =>
              handlePayment(token, verifiedBuyer)
            }
            createPaymentRequest={() => ({
              countryCode: "US",
              currencyCode: "USD",
              total: {
                amount: amount || "1.00",
                label: "Total",
              },
              requestBillingContact: true,
              billingContact: {
                email: customerEmail,
              },
              verificationDetails: {
                intent: "CHARGE",
                amount: amount || "1.00",
                currencyCode: "USD",
                billingContact: {
                  email: customerEmail,
                },
              },
            })}
          >
            <CreditCard />
            <button disabled={!amount || !customerEmail}>Pay ${amount || "0.00"}</button>
          </PaymentForm>
        </>
      ) : (
        <div>
          <h2>Payment Successful!</h2>
          <p>Transaction ID: {paymentDetails.payment.id}</p>
          <p>Amount Paid: ${paymentDetails.payment.amountMoney.amount / 100}</p>
          <p>Status: {paymentDetails.payment.status}</p>
          <a
            href={paymentDetails.payment.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Receipt
          </a>
        </div>
      )}
    </div>
  );
};

export async function getServerSideProps(context) {
  const token = await getToken({
    req:    context.req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.email) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const dbUser = await prisma.user.findUnique({
    where:  { email: token.email },
    select: { otpVerified: true },
  });

  if (!dbUser?.otpVerified) {
    return { redirect: { destination: "/", permanent: false } };
  }

  return { props: {} };
}

export default Payment;
