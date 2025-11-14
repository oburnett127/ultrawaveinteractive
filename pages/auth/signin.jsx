import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignIn() {
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const email = e.target.email.value;
    const password = e.target.password.value;

    // Google reCAPTCHA v3 token
    const recaptchaToken = await grecaptcha.execute(
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
      { action: "login" }
    );

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      recaptchaToken,
    });

    if (result.error) {
      setError("Invalid login.");
      return;
    }

    window.location.href = "/";
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit">Sign In</button>
    </form>
  );
}


// import { useEffect, useRef, useState } from "react";
// import { signIn } from "next-auth/react";
// import Script from "next/script";

// const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

// export default function SignIn() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [err, setErr] = useState("");
//   const [widgetId, setWidgetId] = useState(null);
//   const [apiReady, setApiReady] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const containerRef = useRef(null);
//   const initializedRef = useRef(false);

//   // Initialize reCAPTCHA once when API is ready
//   useEffect(() => {
//     if (!apiReady || initializedRef.current) return;
//     if (!containerRef.current || !window.grecaptcha) return;

//     try {
//       const id = window.grecaptcha.render(containerRef.current, {
//         sitekey: SITE_KEY,
//         theme: "light",
//         size: "normal",
//         callback: () => setErr(""), // clear error when user completes captcha
//       });
//       setWidgetId(id);
//       initializedRef.current = true;
//     } catch (error) {
//       console.error("Error initializing reCAPTCHA:", error);
//       setErr("Failed to load reCAPTCHA. Please refresh and try again.");
//     }
//   }, [apiReady]);

//   async function onSubmit(e) {
//     e.preventDefault();
//     setErr("");

//     if (isSubmitting) return; // prevent double-click spam

//     if (!window.grecaptcha || widgetId === null) {
//       setErr("reCAPTCHA is still loading. Please wait a moment and try again.");
//       return;
//     }

//     const recaptchaToken = window.grecaptcha.getResponse(widgetId);
//     if (!recaptchaToken) {
//       setErr("Please complete the reCAPTCHA challenge.");
//       return;
//     }

//     // Basic frontend validation
//     if (!email.trim() || !password.trim()) {
//       setErr("Email and password are required.");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const result = await signIn("credentials", {
//         redirect: false, // handle errors manually for better UX
//         email,
//         password,
//         recaptchaToken,
//         callbackUrl: "/verifyotp",
//       });

//       if (result.error) {
//         // Reset reCAPTCHA for another attempt
//         if (widgetId !== null && window.grecaptcha?.reset) {
//           window.grecaptcha.reset(widgetId);
//         }
//         setErr(result.error || "Invalid credentials. Please try again.");
//       } else if (result.ok) {
//         // Graceful redirect only after success
//         window.location.href = result.url || "/verifyotp";
//       } else {
//         setErr("Unexpected error. Please try again later.");
//       }
//     } catch (error) {
//       console.error("Sign-in error:", error);
//       setErr("Network or server error. Please try again later.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   }

//   return (
//     <>
//       <Script
//         src="https://www.google.com/recaptcha/api.js?render=explicit"
//         strategy="afterInteractive"
//         onLoad={() => {
//           if (window.grecaptcha?.ready) {
//             window.grecaptcha.ready(() => setApiReady(true));
//           } else {
//             setApiReady(true);
//           }
//         }}
//         onError={() => {
//           console.error("Failed to load reCAPTCHA script.");
//           setErr("Failed to load reCAPTCHA. Please refresh and try again.");
//         }}
//       />

//       <form onSubmit={onSubmit} className="signin-form" noValidate>
//         <h1>Sign in</h1>

//         <label htmlFor="email" className="signin-label">
//           Email
//         </label>
//         <input
//           id="email"
//           name="email"
//           type="email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           autoComplete="email"
//           required
//           className="signin-input"
//           disabled={isSubmitting}
//         />

//         <label htmlFor="password" className="signin-label">
//           Password
//         </label>
//         <input
//           id="password"
//           name="password"
//           type="password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           autoComplete="current-password"
//           required
//           className="signin-input"
//           disabled={isSubmitting}
//         />

//         {/* reCAPTCHA widget */}
//         <div
//           ref={containerRef}
//           className="recaptcha-container"
//           aria-live="polite"
//           style={{ marginTop: "1rem", marginBottom: "1rem" }}
//         />

//         <button
//           type="submit"
//           className="signin-button"
//           disabled={!apiReady || isSubmitting}
//         >
//           {isSubmitting ? "Signing in..." : "Sign in"}
//         </button>

//         {err && <p className="signin-error">⚠️ {err}</p>}
//       </form>
//     </>
//   );
// }
