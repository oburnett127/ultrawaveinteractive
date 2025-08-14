import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState(null);
  const [sending, setSending] = useState(false);

  // Optional: auto-send on mount (login flow already sent one; this is just a safety net)
  useEffect(() => {
    // Comment out if you don't want auto-resend on load
    // onResend().catch(() => {});
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);
    if (String(code).trim().length !== 6) {
      setMsg({ type: "error", text: "Enter the 6-digit code." });
      return;
    }
    setSending(true);
    try {
      const r = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: String(code).trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ type: "error", text: data?.error || "Verification failed." });
      } else {
        // Cookie is set by server; now go to payment
        router.push("/payment");
      }
    } catch {
      setMsg({ type: "error", text: "Network error." });
    } finally {
      setSending(false);
    }
  }

  async function onResend() {
    setMsg(null);
    setSending(true);
    try {
      const r = await fetch("/api/auth/send-otp", { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) setMsg({ type: "error", text: data?.error || "Could not send code." });
      else setMsg({ type: "success", text: "A new code was sent to your email." });
    } catch {
      setMsg({ type: "error", text: "Network error." });
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "2rem auto", padding: "1rem" }}>
      <h1>Verify your sign-in</h1>
      <p>Enter the 6-digit code we emailed you.</p>

      <form onSubmit={onSubmit} noValidate>
        <label style={{ display: "block", marginTop: 16 }}>
          Code
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{ width: "100%", padding: 8, marginTop: 6, letterSpacing: "6px", fontSize: 20, textAlign: "center" }}
          />
        </label>

        {msg && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: msg.type === "error" ? "#ffe8e8" : "#e8ffef",
              border: "1px solid",
              borderColor: msg.type === "error" ? "#ffb3b3" : "#a6f3c1",
            }}
          >
            {msg.text}
          </div>
        )}

        <button type="submit" disabled={sending} style={{ marginTop: 14, padding: "10px 14px" }}>
          {sending ? "Verifying..." : "Verify"}
        </button>

        <button type="button" onClick={onResend} disabled={sending} style={{ marginTop: 14, marginLeft: 8, padding: "10px 14px" }}>
          Resend code
        </button>
      </form>
    </main>
  );
}
