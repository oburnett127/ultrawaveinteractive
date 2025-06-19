import React, { useState, useRef } from "react";
import ReCAPTCHA from 'react-google-recaptcha';
import styles from "./ContactForm.module.css"; // Adjust this path as needed

const ContactForm = () => {

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });

  const [responseMessage, setResponseMessage] = useState("");
  const [recaptchaError, setRecaptchaError] = useState("");
  const recaptchaRef = useRef(null);


  // Helper function to sanitize input
  const sanitizeInput = (input) => {
    const div = document.createElement("div");
    div.innerText = input;
    return div.innerHTML; // Escape any HTML/JS content
  };

  // Handle input changes with sanitization
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: sanitizeInput(value) }));
  };

  // Validate form fields before submission
  const isFormValid = () => {
    const { firstName, lastName, email, phone, message } = formData;

    // Check required fields
    if (!firstName || !lastName || !email || !message) {
      setResponseMessage("Please fill in all required fields.");
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setResponseMessage("Please enter a valid email address.");
      return false;
    }

    // Validate phone number (if provided)
    if (phone) {
      const phoneRegex = /^[0-9+\-()\s]*$/; // Allow digits, spaces, +, -, and ()
      if (!phoneRegex.test(phone)) {
        setResponseMessage("Please enter a valid phone number.");
        return false;
      }
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form data before sending
    if (!isFormValid()) return;

    // Get the reCAPTCHA token
    const recaptchaToken = recaptchaRef.current?.getValue() || "missing-recaptcha-token";
    if (!recaptchaToken) {
      setRecaptchaError("Please complete the reCAPTCHA.");
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ formData, recaptchaToken }),
      });

      if (response.status === 429) {
        setResponseMessage("Too many requests! Please try again later.");
        return;
      }

      const result = await response.text();
      setResponseMessage(result);

      // Optionally clear the form on success
      if (result === "Message sent successfully!") {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          message: "",
        });
      }

      // Reset reCAPTCHA after form submission
      (window).grecaptcha?.reset();
    } catch (error) {
      setResponseMessage("An error occurred while sending the message.");
      console.error(error);
    }
  };

  return (
    <div className={styles.formContainer}>
      <form className={styles.contactForm} onSubmit={handleSubmit}>
        <input
          type="text"
          id="firstName"
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          id="lastName"
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          id="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          type="tel"
          id="phone"
          name="phone"
          placeholder="Phone (Optional)"
          value={formData.phone}
          onChange={handleChange}
        />

        <textarea
          id="message"
          name="message"
          placeholder="Your Message"
          value={formData.message}
          onChange={handleChange}
          required
        />

        {/* Render the reCAPTCHA widget */}
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "no-recaptcha-site-key"}
          size="compact" // Display the checkbox reCAPTCHA
        />
        {recaptchaError && <p className={styles.error}>{recaptchaError}</p>}

        <button className={styles.button} type="submit">
          Submit
        </button>
      </form>

      {responseMessage && (
        <div className={styles.responseMessage}>
          <p>{responseMessage}</p>
        </div>
      )}
    </div>
  );
};

export default ContactForm;
