// components/PaymentPageInner.jsx
import { useEffect, useRef, useState } from "react";

export default function PaymentPageInner() {
  const containerRef = useRef(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [card, setCard] = useState(null);

  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

  // Hydration probe status (optional to show on page)
  useEffect(() => {
    if (!window.__CSP_PROBE__) {
      console.warn("CSP probe not seen. Inline scripts may be blocked.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function waitFor(cond, tries = 40, step = 125) {
      for (let i = 0; i < tries; i++) {
        if (cancelled) return false;
        if (cond()) return true;
        await new Promise(r => setTimeout(r, step));
      }
      return false;
    }

    (async () => {
      setError("");
      setStatus("Preparing…");

      if (!appId || !locationId) {
        setError("Square app/location IDs are undefined (check build-time env).");
        setStatus("");
        return;
      }

      const okSdk = await waitFor(() => typeof window !== "undefined" && !!window.Square);
      if (!okSdk) {
        setError("Square SDK not loaded. Check CSP and script tag in _document.");
        setStatus("");
        return;
      }

      const okNode = await waitFor(() => !!containerRef.current);
      if (!okNode) {
        setError("Card container not found in DOM.");
        setStatus("");
        return;
      }

      try {
        setStatus("Initializing payments…");
        const payments = await window.Square.payments(appId, locationId);
        const cardComp = await payments.card();
        await cardComp.attach(containerRef.current);
        if (cancelled) return;
        setCard(cardComp);
        setStatus("Card ready.");
      } catch (e) {
        console.error("Square init error:", e);
        setError(e?.message || "Failed to initialize Square.");
        setStatus("");
      }
    })();

    return () => { cancelled = true; };
  }, [appId, locationId]);

  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function handlePay(e) {
    e.preventDefault();
    setError(""); setStatus("");

    if (!card) {
      setError("Card form not ready.");
      return;
    }
    const t = await card.tokenize();
    if (t.status !== "OK") {
      console.error("Tokenize failed:", t);
      setError(t?.errors?.[0]?.message || "Card tokenization failed.");
      return;
    }
    try {
      const r = await fetch("/api/square/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sourceId: t.token,
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
    <div style={{ maxWidth: 460, margin: "2rem auto" }}>
      <h1>Make a Payment</h1>

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

        {/* Square injects an iframe here */}
        <div ref={containerRef} id="card-container" style={{ margin: "16px 0" }} />

        <button type="submit" disabled={!card}>Pay</button>
        {status ? <p style={{ color: "green" }}>{status}</p> : null}
        {error ? <p style={{ color: "red" }}>{error}</p> : null}
      </form>
    </div>
  );
}
