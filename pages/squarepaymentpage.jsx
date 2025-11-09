import { useEffect, useState } from "react";

export default function SquarePaymentPage() {
  const [payments, setPayments] = useState(null);
  const [card, setCard] = useState(null);
  const [amount, setAmount] = useState(""); // User-entered amount
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Initialize Square Payment SDK
  useEffect(() => {
    async function initializeSquare() {
      if (!window.Square) return;

      try {
        const paymentsInstance = window.Square.payments(
          process.env.NEXT_PUBLIC_SQUARE_APP_ID,
          process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
        );
        const cardInstance = await paymentsInstance.card();
        await cardInstance.attach("#card-container");

        setPayments(paymentsInstance);
        setCard(cardInstance);
      } catch (err) {
        console.error("Error initializing Square:", err);
        setMessage("Payment system unavailable.");
      }
    }

    initializeSquare();
  }, []);

  // Execute Invisible reCAPTCHA
  function executeRecaptcha() {
    return new Promise((resolve, reject) => {
      if (!window.grecaptcha) {
        reject(new Error("reCAPTCHA not loaded"));
      }
      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: "payment" })
          .then(resolve)
          .catch(reject);
      });
    });
  }

  async function handlePayment(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Validate amount before proceeding
      const cleanedAmount = amount.trim();
      if (!/^\d+(\.\d{1,2})?$/.test(cleanedAmount)) {
        throw new Error("Please enter a valid amount (e.g., 10 or 19.99)");
      }

      // 1️⃣ Tokenize card (get sourceId)
      const result = await card.tokenize();
      if (result.status !== "OK") {
        throw new Error("Card tokenization failed. Please check your card details.");
      }
      const sourceId = result.token;

      // 2️⃣ Execute reCAPTCHA
      const recaptchaToken = await executeRecaptcha();

      // 3️⃣ Call backend route
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";
      const response = await fetch(`${backendUrl}/api/payments/charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId,
          amount: cleanedAmount,
          recaptchaToken,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("✅ Payment successful!");
      } else {
        setMessage("❌ Payment failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handlePayment}>
      <h2>Enter Payment Amount</h2>

      <label>Amount (USD):</label>
      <input
        type="text"
        placeholder="e.g. 25.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      <div id="card-container" className="space-above"></div>

      <div
        className="g-recaptcha"
        data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
        data-size="invisible"
      ></div>

      <button type="submit" disabled={loading || !card}>
        {loading ? "Processing..." : `Pay $${amount || "..."}`}
      </button>

      {message && <p>{message}</p>}
    </form>
  );
}
