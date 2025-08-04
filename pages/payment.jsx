/* pages/payment.jsx ------------------------------------------------------- */
import React, { useState } from "react";
import { PaymentForm, CreditCard } from "react-square-web-payments-sdk";
import { useSession } from "next-auth/react";
import DOMPurify from "dompurify";
import { getToken } from "next-auth/jwt";
import prisma from "../lib/prisma.cjs";


const Payment = () => {
  const { data: session } = useSession();

  const [amount, setAmount] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentDetails, setPaymentDetails] = useState(null);

  const backendUrl    = process.env.NEXT_PUBLIC_BACKEND_URL;
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  const locationId    = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

  /* ------------- form helpers ------------------------------------------ */
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    if (id === "amount") {
      setAmount(value.replace(/[^0-9.]/g, ""));
    } else if (id === "customerEmail") {
      setCustomerEmail(DOMPurify.sanitize(value));
    }
  };

  /* ------------- send Square nonce to backend -------------------------- */
  const handlePayment = async (token) => {
    if (!session?.user?.email) {
      alert("You must be logged in to make a payment."); return;
    }

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100);

      const res = await fetch(`${backendUrl}/process-payment`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email:        session.user.email,
          receiptEmail: customerEmail,
          nonce:        token.token,
          amount:       amountInCents,
        }),
      });

      const data = await res.json();
      if (!res.ok) { alert(data.error || "Payment failed"); return; }

      setPaymentDetails(data);
      alert("Payment successful!");
    } catch (err) {
      console.error("Payment error:", err);
      alert("An error occurred. Please try again.");
    }
  };

  /* ------------- render ------------------------------------------------- */
  if (!session?.user?.email) return <p>You must be logged in.</p>;

  return (
    <div>
      <h1>Payment Page</h1>
      <h2>Payment submission may take 30 – 60 seconds</h2>

      {!paymentDetails ? (
        <>
          <form>
            <label>Payment Amount (USD):</label>
            <input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={handleInputChange}
              placeholder="Enter amount"
              required
            />

            <label>Receipt Email:</label>
            <input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={handleInputChange}
              placeholder="Enter your email"
              required
            />
          </form>

          <PaymentForm
            applicationId={applicationId}
            locationId={locationId}
            cardTokenizeResponseReceived={handlePayment}
            createPaymentRequest={() => ({
              countryCode:  "US",
              currencyCode: "USD",
              total: { label: "Total", amount: amount || "1.00" },
              requestBillingContact: true,
              billingContact: { email: customerEmail },
              verificationDetails: {
                intent:  "CHARGE",
                amount:  amount || "1.00",
                currencyCode: "USD",
                billingContact: { email: customerEmail },
              },
            })}
          >
            <CreditCard />
            <button disabled={!amount || !customerEmail}>
              Pay ${amount || "0.00"}
            </button>
          </PaymentForm>
        </>
      ) : (
        <div>
          <h2>Payment Successful!</h2>
          <p>Transaction ID: {paymentDetails.payment.id}</p>
          <p>
            Amount Paid: ${paymentDetails.payment.amountMoney.amount / 100}
          </p>
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

/* ---------------- server-side guard ------------------------------------ */
export async function getServerSideProps(context) {
  const token = await getToken({
    req: context.req,
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
    return { redirect: { destination: "/verifyotp", permanent: false } };
  }

  return { props: {} };
}

export default Payment;
