import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { getSession, useSession } from "next-auth/react";

export default function VerifyOTP() {
  const { update } = useSession();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seconds until resend allowed
  const didSendRef = useRef(false);
  const router = useRouter();

  // Kick off OTP send on first render
  useEffect(() => {
    const email = (localStorage.getItem("otpEmail") || "").trim().toLowerCase();
    if (!email) {
      setError("Missing email. Please sign in again.");
      router.replace("/auth/signin");
      return;
    }
    // Prevent double-send from React Strict Mode
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

        if (!res.ok) {
          console.error("send-otp failed:", data);
          throw new Error(data.error || "Failed to send OTP");
        }

        setInfo("We sent a 6-digit code to your email.");
        setCooldown(30); // small resend cooldown
      } catch (err) {
        console.error("Error sending OTP:", err);
        setError(err.message || "Failed to send OTP");
        setInfo("");
      } finally {
        setSending(false);
      }
    })();
  }, [router]);

  // Resend cooldown timer
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);

    try {
      const email = (localStorage.getItem("otpEmail") || "").trim().toLowerCase();
      if (!email) {
        throw new Error("Missing email. Please sign in again.");
      }

      //console.log('email is: ', email);
      //console.log('otp is: ', otp);

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

      if (!res.ok) {
        if (payload.raw && payload.raw.startsWith("<!DOCTYPE")) {
          console.error("Server returned HTML:\n", payload.raw);
          throw new Error("Server error (HTML response). Check route path and logs.");
        }
        throw new Error(payload.error || "OTP verification failed");
      }

      // Refresh session so otpVerified reflects in the session
      const session = await getSession();
      if (session?.user?.email) {
        //console.log('session.user.email is set');
        await update({ user: { otpVerified: true } });

        // Now navigate to /payment — middleware will let it through
        window.location.assign("/payment");
      } else {
        throw new Error("Session didn’t refresh. Please reload and try again.");
      }
    } catch (err) {
      console.error("OTP verification failed:", err);
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
    <div style={{ maxWidth: 420, margin: "2rem auto", padding: "1rem" }}>
      <h1>Verify OTP</h1>
      {info && (
        <div style={{ marginTop: 10, padding: "8px 12px", background: "#eef9ff", border: "1px solid #bde3f8" }}>
          {info}
        </div>
      )}
      {error && (
        <div role="alert" style={{ marginTop: 10, padding: "8px 12px", background: "#ffe8e8", border: "1px solid #ffb3b3" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleVerify} style={{ marginTop: 16 }}>
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
            style={{ display: "block", width: "100%", padding: 8, marginTop: 6 }}
            placeholder="123456"
          />
        </label>

        <button type="submit" disabled={busy} style={{ marginTop: 12, padding: "10px 14px" }}>
          {busy ? "Verifying..." : "Verify"}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleResend} disabled={sending || cooldown > 0} style={{ padding: "8px 12px" }}>
          {sending ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}
