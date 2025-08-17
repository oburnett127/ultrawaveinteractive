// pages/auth/signin.jsx
import React, { useState } from "react";
import Script from "next/script";
import { signIn } from "next-auth/react";

export default function SignIn() {
  const [email, setEmail]   = useState("");
  const [password, setPass] = useState("");
  const [msg, setMsg]       = useState(null);
  const [busy, setBusy]     = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);

    // 1) Ensure checkbox solved (client-side UX guard)
    const token =
      typeof window !== "undefined" &&
      window.grecaptcha &&
      window.grecaptcha.getResponse
        ? window.grecaptcha.getResponse()
        : "";

    if (!token) {
      setMsg({ type: "error", text: "Please complete the reCAPTCHA." });
      return;
    }

    setBusy(true);

    try {
      // Optional: persist email for your verifyotp page
      localStorage.setItem("otpEmail", email.trim());

      // 2) Pass token to NextAuth credentials
      await signIn("credentials", {
        email,
        password,
        recaptchaToken: token,
        redirect: true,
        callbackUrl: "/verifyotp",
      });
    } catch (err) {
      console.error("Sign-in failed:", err);
      setMsg({ type: "error", text: "Sign-in failed." });
      // If the token may have expired, reset the widget
      if (window.grecaptcha && window.grecaptcha.reset) {
        window.grecaptcha.reset();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "2rem auto", padding: "1rem" }}>
      {/* reCAPTCHA script */}
      <Script
        src="https://www.google.com/recaptcha/api.js"
        async
        defer
        onError={() => setMsg({ type: "error", text: "Failed to load reCAPTCHA." })}
      />

      <h1>Sign in</h1>
      <form onSubmit={onSubmit}>
        <label style={{ display: "block", marginTop: 16 }}>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label style={{ display: "block", marginTop: 16 }}>
          Password
          <input
            value={password}
            onChange={(e) => setPass(e.target.value)}
            type="password"
            required
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        {/* The v2 Checkbox widget. Google renders it automatically. */}
        <div style={{ marginTop: 16 }}>
          <div
            className="g-recaptcha"
            data-sitekey={siteKey}
            // optional: data-theme="dark"
          />
          <noscript>
            <div style={{ color: "crimson", marginTop: 8 }}>
              JavaScript is required for reCAPTCHA.
            </div>
          </noscript>
        </div>

        {msg && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "#ffe8e8",
              border: "1px solid #ffb3b3",
            }}
          >
            {msg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{ marginTop: 14, padding: "10px 14px" }}
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
