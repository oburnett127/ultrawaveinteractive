"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Protected from "@/components/Protected.jsx"; // adjust if needed
import "./changePassword.css";

export default function ChangePasswordClient() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState({ error: "", success: "" });
  const [isLoading, setIsLoading] = useState(false);

  const abortControllerRef = useRef(null);
  const recaptchaReadyRef = useRef(false);

  // Abort request on unmount
  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  // ---------------------------------------
  // Load reCAPTCHA v3 and mark ready
  // ---------------------------------------
  const getRecaptchaToken = async () => {
    if (!siteKey) {
      setStatus({ error: "Missing reCAPTCHA site key.", success: "" });
      return null;
    }

    if (!window.grecaptcha || !recaptchaReadyRef.current) {
      setStatus({ error: "reCAPTCHA is still loading. Please wait.", success: "" });
      return null;
    }

    try {
      return await window.grecaptcha.execute(siteKey, {
        action: "change_password",
      });
    } catch (err) {
      console.error("reCAPTCHA execute failed:", err);
      setStatus({ error: "reCAPTCHA failed. Please refresh and try again.", success: "" });
      return null;
    }
  };

  // ---------------------------------------
  // Frontend password validation
  // ---------------------------------------
  const validatePasswords = () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      return "Both fields are required.";
    }
    if (newPassword.length < 8) {
      return "New password must be at least 8 characters.";
    }
    if (newPassword === currentPassword) {
      return "New password cannot be the same as your current password.";
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return "New password must include uppercase, lowercase, and a number.";
    }
    return null;
  };

  // ---------------------------------------
  // Submit handler
  // ---------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ error: "", success: "" });

    const validationError = validatePasswords();
    if (validationError) {
      setStatus({ error: validationError, success: "" });
      return;
    }

    const recaptchaToken = await getRecaptchaToken();
    if (!recaptchaToken) return;

    setIsLoading(true);

    // Abort previous request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(`/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          currentPassword,
          newPassword,
          recaptchaToken,
        }),
      });

      if (res.status === 429) {
        setStatus({
          error: "Too many requests. Please wait and try again.",
          success: "",
        });
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({
          error: data?.error || `Request failed (${res.status})`,
          success: "",
        });
      } else {
        setStatus({
          error: "",
          success: data?.message || "Password changed successfully!",
        });
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Change password error:", err);
        setStatus({
          error: "Unable to connect. Please try again later.",
          success: "",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Protected otpRequired>
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
        strategy="afterInteractive"
        onLoad={() => {
          if (window.grecaptcha) {
            window.grecaptcha.ready(() => {
              recaptchaReadyRef.current = true;
            });
          }
        }}
        onError={() =>
          setStatus({ error: "Failed to load reCAPTCHA. Refresh and try again.", success: "" })
        }
      />

      <main id="main-content" className="change-password-container">
        <h2>Change Password</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={isLoading}
              className="passwordInput"
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
              className="passwordInput"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Password"}
          </button>
        </form>

        {status.error && <p className="error-msg">⚠️ {status.error}</p>}
        {status.success && <p className="success-msg">✅ {status.success}</p>}
      </main>
    </Protected>
  );
}
