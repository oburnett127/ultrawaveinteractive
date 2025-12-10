import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Protected from "./Protected.jsx";
import BusinessCard from "./BusinessCard.jsx";

export default function SquarePaymentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const paymentsRef = useRef(null);
  const cardRef = useRef(null);
  const initializedRef = useRef(false);
  const abortControllerRef = useRef(null);

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 👇 NEW STATE — ensures reCAPTCHA renders only on client
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  // --------------------------------------
  // 🟦 INIT SQUARE WHEN OTP VERIFIED
  // --------------------------------------
  useEffect(() => {
    if (!clientReady) return;
    if (status !== "authenticated") return;
    if (!session?.user?.otpVerified) return;

    let cancelled = false;

    async function initSquare() {
      if (cancelled) return;

      if (!window.Square) {
        setTimeout(initSquare, 200);
        return;
      }

      if (initializedRef.current) return;

      const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
      const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

      if (!appId || !locationId) {
        setMessage("⚠️ Payment settings missing.");
        return;
      }

      try {
        const payments = window.Square.payments(appId, locationId);
        paymentsRef.current = payments;

        if (!cardRef.current) {
          const card = await payments.card();
          const target = document.getElementById("card-container");

          if (target && target.children.length === 0) {
            await card.attach("#card-container");
          }

          cardRef.current = card;
        }

        initializedRef.current = true;
        setMessage("");

      } catch (err) {
        console.error("Square init error:", err);
        setMessage("⚠️ Payment system unavailable.");
      }
    }

    initSquare();
    return () => (cancelled = true);
  }, [status, session, clientReady]);

  // --------------------------------------
  // 🟩 reCAPTCHA
  // --------------------------------------
  async function executeRecaptcha() {
    return new Promise((resolve, reject) => {
      if (!window.grecaptcha) return reject(new Error("reCAPTCHA not loaded"));

      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: "payment" })
          .then(resolve)
          .catch(() => reject(new Error("reCAPTCHA failed")));
      });
    });
  }

  // --------------------------------------
  // 💳 HANDLE PAYMENT
  // --------------------------------------
  async function handlePayment(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const cleanedAmount = amount.trim();

      if (!/^\d+(\.\d{1,2})?$/.test(cleanedAmount)) {
        throw new Error("Please enter a valid amount.");
      }

      const card = cardRef.current;
      if (!card) {
        throw new Error("Card is not ready yet.");
      }

      const result = await card.tokenize();
      if (result.status !== "OK") {
        throw new Error("Card could not be processed.");
      }

      const recaptchaToken = await executeRecaptcha();
      const sourceId = result.token;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch("/api/payments/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, amount: cleanedAmount, recaptchaToken }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Payment failed.");

      setMessage("✅ Payment successful!");
      setAmount("");

    } catch (err) {
      setMessage(err.name === "AbortError"
        ? "⚠️ Request timed out. Try again."
        : "❌ " + err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Protected otpRequired>
      <main id="main-content">
        <div className="displayFlex">
          <BusinessCard src="/images/sslencryptionbadge.jpg" alt="SSL encryption badge" />

          <form onSubmit={handlePayment} className="square-payment-form" noValidate>
            <h2>Make a Secure Payment</h2>

            <label htmlFor="amount">Amount (USD):</label>
            <input
              id="amount"
              type="text"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={loading}
            />

            <div id="card-container" className="space-above"></div>

            {/* 👇 Only render reCAPTCHA on client to prevent hydration mismatch */}
            {clientReady && (
              <div
                className="g-recaptcha"
                data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                data-size="invisible"
              ></div>
            )}

            <button type="submit" disabled={loading || !cardRef.current}>
              {loading ? "Processing..." : amount ? `Pay $${amount}` : "Pay"}
            </button>

            {message && <p className="payment-message">{message}</p>}
          </form>
        </div>
      </main>
    </Protected>
  );
}