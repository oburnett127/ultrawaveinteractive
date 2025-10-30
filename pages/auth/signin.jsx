import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import Script from "next/script";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [widgetId, setWidgetId] = useState(null);
  const [apiReady, setApiReady] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    if (!apiReady) return;
    if (!containerRef.current) return;
    if (!window.grecaptcha) return;

    if (widgetId === null) {
      const id = window.grecaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
      });
      setWidgetId(id);
    }
  }, [apiReady, widgetId]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!window.grecaptcha || widgetId === null) {
      setErr("reCAPTCHA not ready yet. Please wait a moment and try again.");
      return;
    }

    const recaptchaToken = window.grecaptcha.getResponse(widgetId);
    if (!recaptchaToken) {
      setErr("Please complete the reCAPTCHA checkbox.");
      return;
    }

    const res = await signIn("credentials", {
      redirect: true,
      email,
      password,
      recaptchaToken,
      callbackUrl: "/verifyotp",
    });
  }

  return (
    <>
      <Script
        src="https://www.google.com/recaptcha/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.grecaptcha?.ready) {
            window.grecaptcha.ready(() => setApiReady(true));
          } else {
            setApiReady(true);
          }
        }}
      />

      <form onSubmit={onSubmit} className="signin-form">
        <h1>Sign in</h1>

        <label className="signin-label">Email</label>
        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="signin-input"
        />

        <label className="signin-label">Password</label>
        <input
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="signin-input"
        />

        {/* reCAPTCHA area */}
        <div ref={containerRef} className="recaptcha-container" aria-live="polite" />

        <button type="submit" className="signin-button">Sign in</button>

        {err ? <p className="signin-error">{err}</p> : null}
      </form>
    </>
  );
}
