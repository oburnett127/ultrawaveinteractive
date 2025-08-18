import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/router";

const WIDGET_KEY = "__uwi_register_recaptcha_widget_id";

export default function Register() {
  const router = useRouter();

  const [emailText, setEmailText] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const recaptchaRef = useRef(null);
  const hasTriedRender = useRef(false);
  const [widgetId, setWidgetId] = useState(null);

  const renderRecaptcha = () => {
    if (typeof window === "undefined") return;
    const w = window;
    if (!w.grecaptcha || !recaptchaRef.current) return;

    // If a widget was already created in any previous render/mount (StrictMode/HMR),
    // reuse it instead of rendering again.
    if (typeof w[WIDGET_KEY] === "number") {
      setWidgetId(w[WIDGET_KEY]);
      return;
    }

    // Avoid calling render twice in dev StrictMode
    if (hasTriedRender.current) return;
    hasTriedRender.current = true;

    w.grecaptcha.ready(() => {
      // Double-check again inside ready (some setups call ready multiple times)
      if (typeof w[WIDGET_KEY] === "number") {
        setWidgetId(w[WIDGET_KEY]);
        return;
      }
      try {
        const id = w.grecaptcha.render(recaptchaRef.current, {
          sitekey: siteKey,
        });
        w[WIDGET_KEY] = id;
        setWidgetId(id);
      } catch (e) {
        // If element was already rendered by a prior mount, fall back to using the cached id
        if (typeof w[WIDGET_KEY] === "number") {
          setWidgetId(w[WIDGET_KEY]);
        } else {
          console.error("reCAPTCHA render error:", e);
          // Surface a helpful message to the user
        }
      }
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.grecaptcha) {
      renderRecaptcha();
    }
    // Only needs to run when siteKey changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      if (typeof window === "undefined" || !window.grecaptcha) {
        setErrorMsg("reCAPTCHA failed to initialize. Please refresh and try again.");
        return;
      }

      // If StrictMode remounted, widgetId state might be null but global cache exists
      const id =
        typeof window[WIDGET_KEY] === "number"
          ? window[WIDGET_KEY]
          : widgetId;

      if (typeof id !== "number") {
        setErrorMsg("reCAPTCHA not ready yet. Please wait a moment and try again.");
        return;
      }

      const token = window.grecaptcha.getResponse(id);
      if (!token) {
        setErrorMsg("Please complete the reCAPTCHA.");
        return;
      }

      setSubmitting(true);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emailText, password, name, recaptchaToken: token }),
      });

      let data;
      try {
        data = await res.json();
      } catch (_) {
        throw new Error("Unexpected server error");
      }

      if (!res.ok) {
        try { window.grecaptcha.reset(id); } catch (_) {}
        throw new Error(data.error || "Registration failed");
      }

      try { window.grecaptcha.reset(id); } catch (_) {}
      router.push("/auth/signin");
    } catch (err) {
      setErrorMsg(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "2rem auto", padding: 16 }}>
      {/* IMPORTANT: give the Script a stable id so HMR/StrictMode doesn't inject duplicates */}
      <Script
        id="recaptcha-v2-script"
        src="https://www.google.com/recaptcha/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderRecaptcha}
      />

      <h1>Create account</h1>

      {!siteKey && (
        <p style={{ color: "crimson" }}>
          NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. The checkbox will not render.
        </p>
      )}

      <form onSubmit={handleRegister}>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            type="text"
            name="name"
            autoComplete="name"
          />
        </label>

        <label>
          Email
          <input
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            required
            type="email"
            name="email"
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
          />
        </label>

        {/* Target container for explicit render */}
        <div
          ref={recaptchaRef}
          style={{ marginTop: 12, marginBottom: 12 }}
          aria-label="reCAPTCHA"
        />

        {errorMsg && <p style={{ color: "crimson" }}>{errorMsg}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}
