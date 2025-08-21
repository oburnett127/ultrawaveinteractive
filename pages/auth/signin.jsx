import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import Script from "next/script";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY; // make sure this is set

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [widgetId, setWidgetId] = useState(null);
  const [apiReady, setApiReady] = useState(false);

  const containerRef = useRef(null);

  // Render the v2 checkbox widget once the API is ready
  useEffect(() => {
    if (!apiReady) return;
    if (!containerRef.current) return;
    if (!window.grecaptcha) return;

    // If not rendered yet, render and keep the widgetId
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
      callbackUrl: "/verifyotp", // your intended post-login page
    });

    // If you prefer to handle the result manually:
    // set redirect:false above and check res?.error here

    // Optionally reset widget after submit attempt
    // window.grecaptcha.reset(widgetId);
  }

  return (
    <>
      {/* Load the official API on the client, after hydration */}
      <Script
        src="https://www.google.com/recaptcha/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          // Make sure API reports as ready before we render
          if (window.grecaptcha?.ready) {
            window.grecaptcha.ready(() => setApiReady(true));
          } else {
            // Fallback in case ready is missing (rare)
            setApiReady(true);
          }
        }}
      />

      <form onSubmit={onSubmit} style={{ maxWidth: 420, margin: "2rem auto" }}>
        <h1>Sign in</h1>

        <label>Email</label>
        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          style={{ display: "block", width: "100%", marginBottom: 12 }}
        />

        <label>Password</label>
        <input
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          style={{ display: "block", width: "100%", marginBottom: 12 }}
        />

        {/* reCAPTCHA v2 checkbox will be rendered into this div */}
        <div
          ref={containerRef}
          style={{ margin: "12px 0" }}
          aria-live="polite"
        />

        <button type="submit">Sign in</button>

        {err ? <p style={{ color: "red" }}>{err}</p> : null}
      </form>
    </>
  );
}
