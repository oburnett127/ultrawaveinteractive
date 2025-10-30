import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { getSession, useSession } from "next-auth/react";
import "../styles/verify-otp.css"; // <-- Make sure path is correct

export default function VerifyOTP() {
  const { update } = useSession();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const didSendRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const email = (localStorage.getItem("otpEmail") || "").trim().toLowerCase();
    if (!email) {
      setError("Missing email. Please sign in again.");
      router.replace("/auth/signin");
      return;
    }
    if (didSendRef.current) return;
    didSendRef.current = true;

    (async () => {
      try {
        setSending(true);
        setInfo("Sending code...");
        setError("");

        const res = await fetch("/api/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        });

        const contentType = res.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
          ? await res.json()
          : { raw: await res.text() };

        if (!res.ok) throw new Error(data.error || "Failed to send OTP");

        setInfo("We sent a 6-digit code to your email.");
        setCooldown(30);
      } catch (error) {
        setError(error.message || "Failed to send OTP");
      } finally {
        setSending(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(
      () => setCooldown((s) => (s > 0 ? s - 1 : 0)),
      1000
    );
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);

    try {
      const email = (localStorage.getItem("otpEmail") || "").trim().toLowerCase();
      if (!email) throw new Error("Missing email. Please sign in again.");

      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp }),
      });

      const contentType = res.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await res.json()
        : { raw: await res.text() };

      if (!res.ok) throw new Error(payload.error || "OTP verification failed");

      await update({ user: { otpVerified: true } });
      window.location.assign("/payment");
    } catch (err) {
      setError(err.message || "Failed to verify OTP");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    const email = (localStorage.getItem("otpEmail") || "").trim().toLowerCase();
    if (!email) {
      setError("Missing email. Please sign in again.");
      router.replace("/auth/signin");
      return;
    }
    try {
      setSending(true);
      setInfo("Resending code...");
      setError("");

      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend OTP");

      setInfo("New code sent.");
      setCooldown(30);
    } catch (e) {
      setError(e.message || "Failed to resend OTP");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="verify-form">
      <h1>Verify OTP</h1>
      {info && <div className="info-box">{info}</div>}
      {error && <div role="alert" className="error-box">{error}</div>}

      <form onSubmit={handleVerify} className="verify-form-inner">
        <label>
          6-digit code
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="verify-input"
            placeholder="123456"
          />
        </label>

        <button type="submit" disabled={busy} className="verify-button">
          {busy ? "Verifying..." : "Verify"}
        </button>
      </form>

      <div className="resend-container">
        <button onClick={handleResend} disabled={sending || cooldown > 0} className="resend-button">
          {sending ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}
