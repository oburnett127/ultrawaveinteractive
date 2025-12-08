import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Script from "next/script";
import Protected from "../components/Protected.jsx";
import { getSession } from "next-auth/react";

export default function VerifyOTP() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const didSendRef = useRef(false);
  const recaptchaReadyRef = useRef(false);

  const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // -----------------------------------------------------
  // reCAPTCHA v3 token getter
  // -----------------------------------------------------
  async function getRecaptchaToken() {
    if (!window.grecaptcha || !recaptchaReadyRef.current) {
      console.warn("VerifyOTP: reCAPTCHA not ready");
      return null;
    }

    try {
      return await window.grecaptcha.execute(SITE_KEY, { action: "otp" });
    } catch (err) {
      console.error("VerifyOTP: grecaptcha.execute error:", err);
      return null;
    }
  }

  // -----------------------------------------------------
  // Wait until reCAPTCHA is ready
  // -----------------------------------------------------
  async function waitForRecaptcha(maxWaitMs = 2000) {
    const start = Date.now();
    while (!recaptchaReadyRef.current && Date.now() - start < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  // -----------------------------------------------------
  // Auto-send OTP after login confirmed
  // -----------------------------------------------------
  useEffect(() => {
    if (status !== "authenticated") return;

    const email = (localStorage.getItem("otpEmail") || "").trim().toLowerCase();

    if (!email) {
      setError("Missing email. Please sign in again.");
      router.replace("/signin");
      return;
    }

    if (didSendRef.current) return; // prevent double send
    didSendRef.current = true;

    (async () => {
      try {
        setSending(true);
        setInfo("Sending code...");
        setError("");

        // Wait for reCAPTCHA
        await waitForRecaptcha();

        const recaptchaToken = await getRecaptchaToken();
        if (!recaptchaToken) {
          setError("Unable to load security verification. Please refresh.");
          return;
        }

        const res = await fetch(`/api/otp/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, recaptchaToken }),
        });

        if (res.status === 429) {
          setError("Too many attempts. Please wait.");
          return;
        }

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to send OTP.");

        setInfo("We sent a 6-digit code to your email.");
        setCooldown(30);
      } catch (err) {
        console.error("Auto-send OTP error:", err);
        setError(err.message || "Failed to send OTP.");
      } finally {
        setSending(false);
      }
    })();
  }, [status, router]);

  // -----------------------------------------------------
  // Cooldown timer
  // -----------------------------------------------------
  useEffect(() => {
    if (!cooldown) return;

    const timer = setInterval(() => {
      setCooldown((n) => (n > 0 ? n - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  // -----------------------------------------------------
  // Verify OTP
  // -----------------------------------------------------
  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);

    try {
      const email = (localStorage.getItem("otpEmail") || "").trim().toLowerCase();
      if (!email) throw new Error("Missing email. Please sign in again.");

      const recaptchaToken = await getRecaptchaToken();
      if (!recaptchaToken) {
        setError("Security verification failed. Please refresh.");
        return;
      }

      const res = await fetch(`/api/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp, recaptchaToken }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "OTP verification failed.");

      // Patch user session to reflect OTP verification
      await update({ user: { otpVerified: true } });

      window.location.assign("/squarepaymentpage");
    } catch (err) {
      setError(err.message || "Failed to verify OTP.");
    } finally {
      setBusy(false);
    }
  }

  // -----------------------------------------------------
  // Resend OTP
  // -----------------------------------------------------
  async function handleResend() {
    const email = (localStorage.getItem("otpEmail") || "").trim().toLowerCase();
    if (!email) {
      setError("Missing email. Please sign in again.");
      router.replace("/signin");
      return;
    }

    try {
      setSending(true);
      setInfo("Resending code...");
      setError("");

      await waitForRecaptcha();
      const recaptchaToken = await getRecaptchaToken();
      if (!recaptchaToken) {
        setError("Unable to load security verification. Please refresh.");
        return;
      }

      const res = await fetch(`/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, recaptchaToken }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to resend OTP.");

      setInfo("A new code was sent.");
      setCooldown(30);
    } catch (e) {
      setError(e.message || "Failed to resend OTP.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Protected>
      <main id="main-content">
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`}
          strategy="afterInteractive"
          onLoad={() => {
            if (window.grecaptcha) {
              window.grecaptcha.ready(() => {
                recaptchaReadyRef.current = true;
                //console.log("VerifyOTP: reCAPTCHA ready");
              });
            }
          }}
          onError={() => {
            setError("Failed to load reCAPTCHA. Refresh the page.");
          }}
        />

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
            <button
              onClick={handleResend}
              disabled={sending || cooldown > 0}
              className="resend-button"
            >
              {sending
                ? "Sending..."
                : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend code"}
            </button>
          </div>
        </div>
      </main>
    </Protected>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);

  // Not logged in → redirect to signin
  if (!session?.user) {
    return {
      redirect: {
        destination: "/signin",
        permanent: false,
      },
    };
  }

  // Logged in and OTP verified → they should NOT be here anymore!
  if (session.user?.otpVerified) {
    return {
      redirect: {
        destination: "/dashboard", // or /dashboard if you prefer
        permanent: false,
      },
    };
  }

  // Logged in but OTP not verified → show OTP page
  return {
    props: { session },
  };
}