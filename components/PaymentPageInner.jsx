

import { useEffect, useState } from "react";
import Script from "next/script";

export default function PaymentPage() {
  const [squareReady, setSquareReady] = useState(false);
  const [payments, setPayments] = useState(null);
  const [card, setCard] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [amountStr, setAmountStr] = useState(""); // customer-entered, e.g. "50", "50.00"

  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

  async function initSquare() {
    setError("");
    if (!window.Square) {
      setError("Square SDK not loaded.");
      return;
    }
    if (!appId || !locationId) {
      console.error("Square init missing IDs", { appId, locationId });
      setError("Payment config missing. Contact support.");
      return;
    }

    try {
      const p = await window.Square.payments(appId, locationId);
      setPayments(p);

      const c = await p.card();
      await c.attach("#card-container");
      setCard(c);
    } catch (e) {
      console.error("Square init error:", e);
      setError(e?.message || "Failed to initialize payment form.");
    }
  }

  // Simple client-side validation for UX (server will validate too)
  function validateAmountStr(str) {
    if (!str) return { ok: false, msg: "Enter an amount." };
    const cleaned = String(str).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
      return { ok: false, msg: "Enter a valid dollar amount (e.g. 10 or 10.99)." };
    }
    const value = parseFloat(cleaned);
    if (!(value > 0)) return { ok: false, msg: "Amount must be greater than 0." };
    if (value > 10000) return { ok: false, msg: "Maximum allowed is $10,000.00." };
    return { ok: true };
  }

  async function handlePay(e) {
    e.preventDefault();
    setStatus("");
    setError("");

    // 1) Basic client validation
    const v = validateAmountStr(amountStr);
    if (!v.ok) {
      setError(v.msg);
      return;
    }

    if (!card) {
      setError("Card form not ready.");
      return;
    }

    // 2) Tokenize the card
    const result = await card.tokenize();
    if (result.status !== "OK") {
      console.error("Tokenize failed:", result);
      setError(
        (result.errors && result.errors[0]?.message) ||
          "Card tokenization failed."
      );
      return;
    }

    // 3) Send to your server to create the payment (server computes cents)
    try {
      const res = await fetch("/api/square/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sourceId: result.token,
          amount: String(amountStr).trim(), // send as a string like "12.34"
          currency: "USD",
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Charge error:", data);
        setError(data?.error || "Payment failed.");
        return;
      }
      setStatus(`Payment successful! Payment ID: ${data.payment?.id}`);
      // Optionally clear the form / reset the widget:
      // window.grecaptcha?.reset();
      // card && window.Square && card.destroy && card.destroy();
    } catch (err) {
      console.error("Charge fetch error:", err);
      setError("Network error during payment.");
    }
  }

  return (
    <>
      <Script
        src="https://web.squarecdn.com/v1/square.js"
        strategy="afterInteractive"
        onLoad={() => setSquareReady(true)}
      />

      <div style={{ maxWidth: 460, margin: "2rem auto" }}>
        <h1>Make a Payment</h1>

        {/* Debug panel while configuring; remove later */}
        <pre style={{ background: "#f7f7f7", padding: 8 }}>
          appId: {String(appId)}{"\n"}locationId: {String(locationId)}{"\n"}
          SDK loaded: {String(!!window?.Square)}
        </pre>

        {squareReady && !payments && (
          <button onClick={initSquare}>Initialize Payment Form</button>
        )}

        <form onSubmit={handlePay} style={{ marginTop: 12 }}>
          <label htmlFor="amount">Amount (USD)</label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
            autoComplete="off"
          />

          <div id="card-container" style={{ margin: "16px 0" }} />

          <button type="submit" disabled={!card}>
            Pay
          </button>

          {error ? <p style={{ color: "red" }}>{error}</p> : null}
          {status ? <p style={{ color: "green" }}>{status}</p> : null}
        </form>
      </div>
    </>
  );
}