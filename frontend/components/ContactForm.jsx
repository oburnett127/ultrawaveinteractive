"use client";

import React, { useState, useEffect } from "react";
import styles from "./ContactForm.module.css";

const ContactForm = () => {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [status, setStatus] = useState({ sending: false, msg: "", err: "" });
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  /** ─────────────────────────────
   *   Load reCAPTCHA v3 script
   *  ───────────────────────────── */
  useEffect(() => {
    if (!siteKey) return;

    if (window.grecaptcha) {
      setRecaptchaReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setRecaptchaReady(true);
    script.onerror = () =>
      setStatus({
        sending: false,
        msg: "",
        err: "Failed to load reCAPTCHA. Please try again later.",
      });

    document.body.appendChild(script);
  }, [siteKey]);

  /** ─────────────────────────────
   *   Form utilities
   *  ───────────────────────────── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (status.msg || status.err) setStatus({ sending: false, msg: "", err: "" });
  };

  const isFormValid = () => {
    const { name, email, phone, message } = formData;

    if (!name || !email || !message) {
      setStatus({
        sending: false,
        msg: "",
        err: "Please fill in all required fields.",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus({
        sending: false,
        msg: "",
        err: "Please enter a valid email address.",
      });
      return false;
    }

    if (phone) {
      const phoneRegex = /^[0-9+\-()\s]*$/;
      if (!phoneRegex.test(phone)) {
        setStatus({
          sending: false,
          msg: "",
          err: "Please enter a valid phone number.",
        });
        return false;
      }
    }

    return true;
  };

  /** ─────────────────────────────
   *   Execute reCAPTCHA v3
   *  ───────────────────────────── */
  const getRecaptchaToken = async () => {
    if (!recaptchaReady || !window.grecaptcha) {
      throw new Error("reCAPTCHA not ready");
    }

    return await window.grecaptcha.execute(siteKey, {
      action: "contact_form",
    });
  };

  /** ─────────────────────────────
   *   Submit handler
   *  ───────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status.sending) return;
    if (!isFormValid()) return;

    setStatus({ sending: true, msg: "", err: "" });

    let recaptchaToken;
    try {
      recaptchaToken = await getRecaptchaToken();
    } catch (err) {
      setStatus({
        sending: false,
        msg: "",
        err: "reCAPTCHA verification failed. Please try again.",
      });
      return;
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      message: formData.message.trim(),
      recaptchaToken, // 👈 v3 token
    };

    let res;
    try {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          break;
        } catch (err) {
          if (attempt === 2) throw err;
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        setStatus({
          sending: false,
          msg: "",
          err: "Too many requests. Please wait a minute and try again.",
        });
        return;
      }

      if (!res.ok) {
        const errText =
          data?.error ||
          (res.status >= 500
            ? "Server error — please try again later."
            : `Request failed (HTTP ${res.status}).`);

        setStatus({ sending: false, msg: "", err: errText });
        return;
      }

      setStatus({ sending: false, msg: "Message sent successfully!", err: "" });
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      console.error("Network or unexpected error:", error);
      setStatus({
        sending: false,
        msg: "",
        err: "Network error — please check your connection and try again.",
      });
    }
  };

  /** ─────────────────────────────
   *   Render
   *  ───────────────────────────── */
  return (
    <div className={styles.formContainer}>
      <form
        className={styles.contactForm}
        onSubmit={handleSubmit}
        noValidate
        aria-busy={status.sending}
      >
        <div className={styles.formGroup}>
          <label htmlFor="name">
            Name <span aria-hidden="true">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={status.sending}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email">
            Email <span aria-hidden="true">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={status.sending}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="phone">Phone (optional)</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            disabled={status.sending}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="message">
            Your Message <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={6}
            value={formData.message}
            onChange={handleChange}
            required
            disabled={status.sending}
          />
        </div>

        <button className={styles.button} type="submit" disabled={status.sending}>
          {status.sending ? "Sending..." : "Submit"}
        </button>
      </form>

      {(status.msg || status.err) && (
        <div className={styles.responseMessage} aria-live="polite">
          {status.msg && <p className={styles.success}>{status.msg}</p>}
          {status.err && (
            <p className={styles.error} role="alert">
              {status.err}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactForm;
