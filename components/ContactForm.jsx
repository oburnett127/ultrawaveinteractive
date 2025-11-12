import React, { useState, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import styles from "./ContactForm.module.css";

const ContactForm = () => {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [status, setStatus] = useState({ sending: false, msg: "", err: "" });
  const [recaptchaError, setRecaptchaError] = useState("");
  const recaptchaRef = useRef(null);

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
   *   Main submit handler
   *  ───────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status.sending) return;
    if (!isFormValid()) return;

    const recaptchaToken = recaptchaRef.current?.getValue();
    if (!recaptchaToken) {
      setRecaptchaError("Please complete the reCAPTCHA.");
      return;
    }

    setRecaptchaError("");
    setStatus({ sending: true, msg: "", err: "" });

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      message: formData.message.trim(),
      recaptchaToken,
    };

    let res;
    try {
      // Small retry for transient network failures
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          res = await fetch(`${backendUrl}/api/contact`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          break; // success
        } catch (err) {
          if (attempt === 2) throw err;
          await new Promise((r) => setTimeout(r, 500 * attempt)); // brief backoff
        }
      }

      const data = await res.json().catch(() => ({}));

      /** Handle rate limit */
      if (res.status === 429) {
        setStatus({
          sending: false,
          msg: "",
          err: "Too many requests. Please wait a minute and try again.",
        });
        recaptchaRef.current?.reset();
        return;
      }

      /** Handle validation / server errors */
      if (!res.ok) {
        const errText =
          data?.error ||
          (res.status >= 500
            ? "Server error — please try again later."
            : `Request failed (HTTP ${res.status}).`);

        setStatus({ sending: false, msg: "", err: errText });
        recaptchaRef.current?.reset();
        return;
      }

      /** Success */
      setStatus({ sending: false, msg: "Message sent successfully!", err: "" });
      setFormData({ name: "", email: "", phone: "", message: "" });
      recaptchaRef.current?.reset();
    } catch (error) {
      console.error("Network or unexpected error:", error);
      setStatus({
        sending: false,
        msg: "",
        err: "Network error — please check your connection and try again.",
      });
      recaptchaRef.current?.reset();
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
        <input
          type="text"
          id="name"
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleChange}
          required
          autoComplete="name"
          disabled={status.sending}
        />

        <input
          type="email"
          id="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
          disabled={status.sending}
        />

        <input
          type="tel"
          id="phone"
          name="phone"
          placeholder="Phone (Optional)"
          value={formData.phone}
          onChange={handleChange}
          autoComplete="tel"
          disabled={status.sending}
        />

        <textarea
          id="message"
          name="message"
          placeholder="Your Message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={6}
          disabled={status.sending}
        />

        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
          size="compact"
        />
        {recaptchaError && <p className={styles.error}>{recaptchaError}</p>}

        <button
          className={styles.button}
          type="submit"
          disabled={status.sending}
        >
          {status.sending ? "Sending..." : "Submit"}
        </button>
      </form>

      {(status.msg || status.err) && (
        <div
          className={styles.responseMessage}
          aria-live="polite"
          role={status.err ? "alert" : "status"}
        >
          {status.msg && (
            <p className={styles.success || ""}>{status.msg}</p>
          )}
          {status.err && <p className={styles.error}>{status.err}</p>}
        </div>
      )}
    </div>
  );
};

export default ContactForm;
