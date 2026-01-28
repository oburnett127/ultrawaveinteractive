"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const router = useRouter();

  const [emailText, setEmailText] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // ------------------------------------
  // reCAPTCHA v3 token
  // ------------------------------------
  async function getRecaptchaToken() {
    if (!window.grecaptcha) {
      setErrorMsg("reCAPTCHA failed to load. Please refresh the page.");
      return null;
    }

    try {
      await window.grecaptcha.ready(() => {});
      return await window.grecaptcha.execute(siteKey, {
        action: "register",
      });
    } catch (e) {
      console.error("reCAPTCHA execute error:", e);
      return null;
    }
  }

  // ------------------------------------
  // Handle Registration
  // ------------------------------------
  async function handleRegister(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!emailText.trim() || !password.trim() || !name.trim()) {
      setErrorMsg("All fields are required.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    if (!siteKey) {
      setErrorMsg("Site configuration missing. Please contact support.");
      return;
    }

    const recaptchaToken = await getRecaptchaToken();
    if (!recaptchaToken) return;

    setSubmitting(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          emailText,
          password,
          name,
          recaptchaToken,
        }),
      });

      clearTimeout(timeout);

      if (res.status === 429) {
        setErrorMsg("Too many requests. Please wait and try again.");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Server returned ${res.status}`);
      }

      if (data?.success) {
        router.push("/signin");
      } else {
        throw new Error(data?.error || "Unexpected server response.");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setErrorMsg(
          "Request timed out. Please check your connection and try again."
        );
      } else {
        console.error("Registration error:", err);
        setErrorMsg(
          err.message || "Registration failed. Please try again later."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="register-styling">

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
            disabled={submitting}
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
            disabled={submitting}
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
            disabled={submitting}
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        {errorMsg && <p className="red-text">⚠️ {errorMsg}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}