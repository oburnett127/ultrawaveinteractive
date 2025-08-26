// components/PaymentPageInner.jsx
import { useEffect, useState, useRef } from "react";
import Script from "next/script";

export default function PaymentPageInner() {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [payments, setPayments] = useState(null);
  const [card, setCard] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const containerRef = useRef(null);

  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

  // Auto-init when SDK is loaded and container exists
  useEffect(() => {
    if (!sdkLoaded) return;
    if (!containerRef.current) return;
    if (!appId || !locationId) {
      setError("Square app/location IDs are undefined (check build-time env).");
      return;
    }
    if (typeof window === "undefined" || !window.Square) {
      setError("Square SDK not available on window.");
      return;
    }
    (async () => {
      try {
        setError("");
        setStatus("Initializing payments…");
        const p = await window.Square.payments(appId, locationId);
        setPayments(p);
        const c = await p.card();
        await c.attach(containerRef.current); // use element, not selector
        setCard(c);
        setStatus("Card ready.");
      } catch (e) {
        console.error("Square init error:", e);
        setError(e?.message || "Failed to initialize Square.");
        setStatus("");
      }
    })();
  }, [sdkLoaded, appId, locationId]);

  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function handlePay(e) {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!card) {
      setError("Card form not ready.");
      return;
    }
    const res = await card.tokenize();
    if (res.status !== "OK") {
      console.error("Tokenize failed:", res);
      setError(res?.errors?.[0]?.message || "Card tokenization failed.");
      return;
    }
    try {
      const r = await fetch("/api/square/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sourceId: res.token,
          amount: String(amountStr || "").trim(),
          currency: "USD",
          idempotencyKey: uid(),
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        console.error("Charge error:", data);
        setError(data?.error || "Payment failed.");
        return;
      }
      setStatus(`Payment successful! Payment ID: ${data.payment?.id}`);
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
        onLoad={() => setSdkLoaded(true)}
        onError={() => setError("Failed to load Square SDK script.")}
      />

      <div style={{ maxWidth: 460, margin: "2rem auto" }}>
        <h1>Make a Payment</h1>

        {/* Debug panel: shows env + SDK presence */}
        <pre style={{ background: "#f7f7f7", padding: 8, whiteSpace: "pre-wrap" }}>
          appId: {String(appId)}
{"\n"}locationId: {String(locationId)}
{"\n"}SDK loaded: {String(typeof window !== "undefined" && !!window?.Square)}
{"\n"}container present: {String(!!containerRef.current)}
        </pre>

        <form onSubmit={handlePay} style={{ marginTop: 12 }}>
          <label htmlFor="amount">Amount (USD)</label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 50 or 50.00"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
            autoComplete="off"
          />

        {/* Square will inject an iframe here */}
        <div ref={containerRef} id="card-container" style={{ margin: "16px 0" }} />

          <button type="submit" disabled={!card}>Pay</button>

          {error ? <p style={{ color: "red" }}>{error}</p> : null}
          {status ? <p style={{ color: "green" }}>{status}</p> : null}
        </form>
      </div>
    </>
  );
}
