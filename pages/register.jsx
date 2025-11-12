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
  const [apiLoaded, setApiLoaded] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const recaptchaRef = useRef(null);
  const hasTriedRender = useRef(false);
  const [widgetId, setWidgetId] = useState(null);

  // --- Resilient reCAPTCHA initialization ---
  const renderRecaptcha = () => {
    if (typeof window === "undefined" || !recaptchaRef.current) return;
    const w = window;

    if (!w.grecaptcha) {
      console.warn("reCAPTCHA API not ready yet");
      return;
    }

    // If we already rendered before (e.g. due to StrictMode double-mount)
    if (typeof w[WIDGET_KEY] === "number") {
      setWidgetId(w[WIDGET_KEY]);
      return;
    }

    // Prevent double rendering in StrictMode
    if (hasTriedRender.current) return;
    hasTriedRender.current = true;

    try {
      w.grecaptcha.ready(() => {
        // Safety: check again inside ready (sometimes it fires multiple times)
        if (typeof w[WIDGET_KEY] === "number") {
          setWidgetId(w[WIDGET_KEY]);
          return;
        }
        try {
          const id = w.grecaptcha.render(recaptchaRef.current, {
            sitekey: siteKey,
            theme: "light",
            callback: () => setErrorMsg(""), // clear error on completion
          });
          w[WIDGET_KEY] = id;
          setWidgetId(id);
        } catch (e) {
          console.error("reCAPTCHA render error:", e);
          setErrorMsg("Failed to load reCAPTCHA. Please refresh and try again.");
        }
      });
    } catch (e) {
      console.error("reCAPTCHA init failed:", e);
      setErrorMsg("reCAPTCHA could not initialize. Try refreshing the page.");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.grecaptcha) renderRecaptcha();
  }, [apiLoaded, siteKey]);

  // --- Handle registration submission ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!siteKey) {
      setErrorMsg("Site configuration missing. Please contact support.");
      return;
    }

    const w = typeof window !== "undefined" ? window : {};
    if (!w.grecaptcha) {
      setErrorMsg("reCAPTCHA not loaded yet. Please wait a moment.");
      return;
    }

    const id =
      typeof w[WIDGET_KEY] === "number" ? w[WIDGET_KEY] : widgetId;

    if (typeof id !== "number") {
      setErrorMsg("reCAPTCHA not ready yet. Please try again shortly.");
      return;
    }

    const token = w.grecaptcha.getResponse(id);
    if (!token) {
      setErrorMsg("Please complete the reCAPTCHA challenge.");
      return;
    }

    if (!emailText.trim() || !password.trim() || !name.trim()) {
      setErrorMsg("All fields are required.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

    if (!backendUrl) {
      setErrorMsg("Backend URL not configured.");
      setSubmitting(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const res = await fetch(`${backendUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          emailText,
          password,
          name,
          recaptchaToken: token,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429) {
        setErrorMsg("Too many requests. Please wait and try again.");
        return;
      }

      if (!res.ok) {
        let errText;
        try {
          const data = await res.json();
          errText = data?.error;
        } catch (_) {
          errText = `Server returned ${res.status}`;
        }
        throw new Error(errText || "Registration failed.");
      }

      const data = await res.json().catch(() => ({}));

      try {
        w.grecaptcha.reset(id);
      } catch (_) {}

      if (data?.success) {
        router.push("/auth/signin");
      } else {
        throw new Error(data?.error || "Unexpected response from server.");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setErrorMsg("Request timed out. Please check your connection and try again.");
      } else {
        console.error("Registration error:", err);
        setErrorMsg(err.message || "Registration failed. Please try again later.");
      }
      try {
        w.grecaptcha.reset(id);
      } catch (_) {}
    } finally {
      clearTimeout(timeout);
      setSubmitting(false);
    }
  };

  return (
    <div className="register-styling">
      <Script
        id="recaptcha-v2-script"
        src="https://www.google.com/recaptcha/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          setApiLoaded(true);
          renderRecaptcha();
        }}
        onError={() => {
          setErrorMsg("Failed to load reCAPTCHA script. Please refresh and try again.");
        }}
      />

      <h1>Create Account</h1>

      {!siteKey && (
        <p className="red-text">
          Missing NEXT_PUBLIC_RECAPTCHA_SITE_KEY — reCAPTCHA will not load.
        </p>
      )}

      <form onSubmit={handleRegister} noValidate>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            type="text"
            name="name"
            autoComplete="name"
            disabled={submitting}
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
            disabled={submitting}
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
            disabled={submitting}
          />
        </label>

        {/* reCAPTCHA render target */}
        <div
          ref={recaptchaRef}
          className="space-above-below"
          aria-label="reCAPTCHA widget"
        />

        {errorMsg && <p className="red-text">⚠️ {errorMsg}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}
