import { useEffect, useRef, useState } from "react";

export default function SquarePaymentPage() {
  const [payments, setPayments] = useState(null);
  const [card, setCard] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const initializedRef = useRef(false);
  const abortControllerRef = useRef(null);

  // --- Initialize Square Payment SDK ---
  useEffect(() => {
    async function initializeSquare() {
      if (initializedRef.current) return; // Avoid duplicate setup
      if (!window.Square) {
        console.warn("Square SDK not loaded yet.");
        return;
      }

      const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
      const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

      if (!appId || !locationId) {
        console.error("Missing Square environment variables.");
        setMessage("⚠️ Payment configuration is incomplete. Please contact support.");
        return;
      }

      try {
        const paymentsInstance = window.Square.payments(appId, locationId);
        const cardInstance = await paymentsInstance.card();
        await cardInstance.attach("#card-container");

        setPayments(paymentsInstance);
        setCard(cardInstance);
        initializedRef.current = true;
        setMessage("");
      } catch (err) {
        console.error("Error initializing Square:", err);
        setMessage("⚠️ Payment system unavailable. Please try again later.");
      }
    }

    initializeSquare();
  }, []);

  // --- Execute reCAPTCHA safely ---
  async function executeRecaptcha() {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.grecaptcha) {
        return reject(new Error("reCAPTCHA not loaded"));
      }

      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: "payment" })
          .then(resolve)
          .catch(() => reject(new Error("reCAPTCHA verification failed")));
      });
    });
  }

  // --- Handle Payment Submission ---
  async function handlePayment(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      // Input validation
      const cleanedAmount = amount.trim();
      if (!/^\d+(\.\d{1,2})?$/.test(cleanedAmount)) {
        throw new Error("Please enter a valid amount (e.g., 10 or 19.99).");
      }

      if (!card) {
        throw new Error("Payment card not ready. Please wait a moment and try again.");
      }

      // Tokenize card
      const result = await card.tokenize();
      if (result.status !== "OK") {
        console.warn("Card tokenization failed:", result);
        throw new Error("Unable to process card details. Please re-enter and try again.");
      }

      const sourceId = result.token;

      // reCAPTCHA verification
      const recaptchaToken = await executeRecaptcha().catch(() => {
        throw new Error("reCAPTCHA failed. Please refresh the page and try again.");
      });

      // Backend request
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";
      if (!backendUrl) {
        throw new Error("Backend not configured. Please contact support.");
      }

      // Abort setup for network timeout
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const res = await fetch(`/api/payments/charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, amount: cleanedAmount, recaptchaToken }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429) {
        throw new Error("Too many requests. Please wait and try again.");
      }

      let data;
      try {
        data = await res.json();
      } catch (_) {
        throw new Error("Unexpected server response. Please try again later.");
      }

      if (!res.ok) {
        throw new Error(data?.error || `Payment failed (HTTP ${res.status}).`);
      }

      setMessage("✅ Payment successful! Thank you for your purchase.");
      setAmount("");
    } catch (err) {
      if (err.name === "AbortError") {
        setMessage("⚠️ Request timed out. Please try again in a few seconds.");
      } else {
        console.error("Payment error:", err);
        setMessage("❌ " + (err.message || "Payment failed. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handlePayment} className="square-payment-form" noValidate>
      <h2>Make a Secure Payment</h2>

      <label htmlFor="amount">Amount (USD):</label>
      <input
        id="amount"
        type="text"
        placeholder="e.g. 25.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        disabled={loading}
      />

      <div id="card-container" className="space-above" aria-label="Card input field"></div>

      {/* Invisible reCAPTCHA target */}
      <div
        className="g-recaptcha"
        data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
        data-size="invisible"
      ></div>

      <button type="submit" disabled={loading || !card}>
        {loading ? "Processing..." : amount ? `Pay $${amount}` : "Pay"}
      </button>

      {message && <p className="payment-message">{message}</p>}
    </form>
  );
}
