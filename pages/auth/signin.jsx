import { useState } from "react";
import { signIn } from "next-auth/react";
import Script from "next/script";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (loading) return;
    if (!ready || !window.grecaptcha) {
      setErr("reCAPTCHA is still loading. Please wait a moment and try again.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErr("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      // 🔐 Get v3 token
      const token = await window.grecaptcha.execute(SITE_KEY, {
        action: "login",
      });

      if (!token) {
        setErr("Unable to verify reCAPTCHA. Please try again.");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        recaptchaToken: token,
        callbackUrl: "/verifyotp",
      });

      if (result.error) {
        setErr(result.error);
      } else {
        window.location.href = result.url || "/verifyotp";
      }
    } catch (error) {
      console.error(error);
      setErr("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`}
        strategy="afterInteractive"
        onLoad={() => {
          window.grecaptcha.ready(() => setReady(true));
        }}
      />

      <form onSubmit={handleSubmit} className="signin-form" noValidate>
        <h1>Sign in</h1>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          disabled={loading}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          disabled={loading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {err && <p className="signin-error">⚠️ {err}</p>}
      </form>
    </>
  );
}
