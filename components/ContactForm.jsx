import React, { useState, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import styles from "./ContactForm.module.css"; // adjust if needed

const ContactForm = () => {
  // Prefer relative path when frontend and backend are unified.
  // If you truly need a full URL, set NEXT_PUBLIC_BACKEND_URL and we’ll use it.
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

  const handleChange = (e) => {
    const { name, value } = e.target; // <-- use "name"
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (status.msg || status.err) setStatus({ sending: false, msg: "", err: "" });
  };

  const isFormValid = () => {
    const { name, email, phone, message } = formData;

    if (!name || !email || !message) {
      setStatus({ sending: false, msg: "", err: "Please fill in all required fields." });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus({ sending: false, msg: "", err: "Please enter a valid email address." });
      return false;
    }

    if (phone) {
      const phoneRegex = /^[0-9+\-()\s]*$/;
      if (!phoneRegex.test(phone)) {
        setStatus({ sending: false, msg: "", err: "Please enter a valid phone number." });
        return false;
      }
    }

    return true;
  };

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

    try {
      const res = await fetch(`${backendUrl}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send everything the backend may need, including the captcha token
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          recaptchaToken,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        setStatus({ sending: false, msg: "", err: "Too many requests. Try again later." });
        recaptchaRef.current?.reset();
        return;
      }

      if (!res.ok) {
        const errText = data?.error || `HTTP ${res.status}`;
        setStatus({ sending: false, msg: "", err: errText });
        recaptchaRef.current?.reset();
        return;
      }

      setStatus({ sending: false, msg: "Message sent successfully!", err: "" });
      setFormData({ name: "", email: "", phone: "", message: "" });
      recaptchaRef.current?.reset();
    } catch (error) {
      console.error(error);
      setStatus({ sending: false, msg: "", err: "An error occurred while sending the message." });
      recaptchaRef.current?.reset();
    }
  };

  return (
    <div className={styles.formContainer}>
      <form className={styles.contactForm} onSubmit={handleSubmit} noValidate>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleChange}
          required
          autoComplete="name"
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
        />

        <input
          type="tel"
          id="phone"
          name="phone"
          placeholder="Phone (Optional)"
          value={formData.phone}
          onChange={handleChange}
          autoComplete="tel"
        />

        <textarea
          id="message"
          name="message"
          placeholder="Your Message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={6}
        />

        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
          size="compact"
        />
        {recaptchaError && <p className={styles.error}>{recaptchaError}</p>}

        <button className={styles.button} type="submit" disabled={status.sending}>
          {status.sending ? "Sending..." : "Submit"}
        </button>
      </form>

      {(status.msg || status.err) && (
        <div className={styles.responseMessage} aria-live="polite">
          {status.msg && <p>{status.msg}</p>}
          {status.err && <p className={styles.error}>{status.err}</p>}
        </div>
      )}
    </div>
  );
};

export default ContactForm;
