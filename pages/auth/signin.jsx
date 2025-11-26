import { useState } from "react";
import { signIn } from "next-auth/react";
import Script from "next/script";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (loading) return;
    if (!ready || !window.grecaptcha) {
      setErr("reCAPTCHA is still loading. Please wait a moment and try again.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErr("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      // 🔐 Get v3 token
      const token = await window.grecaptcha.execute(SITE_KEY, {
        action: "login",
      });

      if (!token) {
        setErr("Unable to verify reCAPTCHA. Please try again.");
        setLoading(false);
        return;
      }

      localStorage.setItem("otpEmail", email.trim().toLowerCase());

      setErr(""); // clear previous errors

      try {
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
          recaptchaToken: token,
          callbackUrl: "/verifyotp",
        });

        // ❌ If no result or no OK response → fallback error
        if (!result) {
          setErr("Something went wrong. Please try again.");
          return;
        }

        // 🚫 Login failed (invalid password, reCAPTCHA, LOCKOUT, etc.)
        if (result.error) {
          console.warn("[Login] Authentication error:", result.error);
          setErr(result.error); // Show actual message from authorize()
          return;
        }

        // 🎉 Success — move to callback URL
        const redirectUrl = result.url || "/verifyotp";
        window.location.href = redirectUrl;

      } catch (err) {
        console.error("[Login] Unexpected error:", err);
        setErr("Login failed. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setErr("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`}
        strategy="afterInteractive"
        onLoad={() => {
          window.grecaptcha.ready(() => setReady(true));
        }}
      />

      <form onSubmit={handleSubmit} className="signin-form" noValidate>
        <h1>Sign in</h1>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          disabled={loading}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="signin-input"
        />
        <label htmlFor="password">Password</label>
        <div className="inputWrapper">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            disabled={loading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="passwordInput"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="passwordEye"
          >
            {showPassword ? <VisibilityOff /> : <Visibility />}
          </button>

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
        {err && <p className="signin-error">⚠️ {err}</p>}
      </form>
    </>
  );
}
