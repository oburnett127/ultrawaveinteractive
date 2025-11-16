import { useEffect, useRef, useState } from "react";

export default function SquarePaymentPage() {
  const paymentsRef = useRef(null);
  const cardRef = useRef(null);
  const initializedRef = useRef(false);
  const abortControllerRef = useRef(null);

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // --- Initialize Square only once ---
  useEffect(() => {
    let cancelled = false;

    async function initSquare() {
      // SDK not loaded yet
      if (!window.Square) {
        console.warn("Square SDK not yet available — retrying...");
        setTimeout(initSquare, 200); // retry until script loads
        return;
      }

      // Already initialized
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

        // --- If card already exists, do NOT reattach ---
        if (!cardRef.current) {
          const card = await payments.card();

          // Ensure card-container exists and is empty
          const target = document.getElementById("card-container");
          if (!target) return;

          if (target.children.length === 0) {
            await card.attach("#card-container");
          }

          cardRef.current = card;
        }

        initializedRef.current = true;
        if (!cancelled) setMessage("");

      } catch (err) {
        console.error("Square init error:", err);
        if (!cancelled) {
          setMessage("⚠️ Payment system unavailable.");
        }
      }
    }

    initSquare();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- reCAPTCHA ---
  async function executeRecaptcha() {
    return new Promise((resolve, reject) => {
      if (!window.grecaptcha)
        return reject(new Error("reCAPTCHA not loaded"));

      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            { action: "payment" }
          )
          .then(resolve)
          .catch(() => reject(new Error("reCAPTCHA failed")));
      });
    });
  }

  // --- Handle Payment ---
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

      // Abort controller for timeout
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

      if (!res.ok) {
        throw new Error(data?.error || "Payment failed.");
      }

      setMessage("✅ Payment successful!");
      setAmount("");

    } catch (err) {
      if (err.name === "AbortError") {
        setMessage("⚠️ Request timed out. Try again.");
      } else {
        setMessage("❌ " + err.message);
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
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        disabled={loading}
      />

      <div id="card-container" className="space-above"></div>

      <div
        className="g-recaptcha"
        data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
        data-size="invisible"
      ></div>

      <button type="submit" disabled={loading || !cardRef.current}>
        {loading ? "Processing..." : amount ? `Pay $${amount}` : "Pay"}
      </button>

      {message && <p className="payment-message">{message}</p>}
    </form>
  );
}
