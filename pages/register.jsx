// pages/auth/register.jsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import Script from 'next/script';

export default function Register() {
  const [emailText, setEmailText] = useState('');
  const [name, setName]           = useState('');
  const [password, setPassword]   = useState('');
  const [errorMsg, setErrorMsg]   = useState('');
  const [busy, setBusy]           = useState(false);
  const router                    = useRouter();

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Ensure reCAPTCHA solved
    const token =
      typeof window !== 'undefined' &&
      window.grecaptcha &&
      window.grecaptcha.getResponse
        ? window.grecaptcha.getResponse()
        : '';

    if (!token) {
      setErrorMsg('Please complete the reCAPTCHA.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emailText, password, name, recaptchaToken: token }),
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('Unexpected server error');
      }

      if (!res.ok) {
        const errorText = data?.error || 'Registration failed';
        throw new Error(errorText);
      }

      // Auto-login after successful registration
      // NOTE: If your Credentials provider expects `email`, change `emailText` -> `email`.
      const loginResult = await signIn('credentials', {
        redirect: false,
        emailText,
        password,
      });

      if (loginResult?.ok) {
        router.push('/verifyotp');
      } else {
        throw new Error('Account created but login failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'Registration failed');
      if (window.grecaptcha && window.grecaptcha.reset) {
        window.grecaptcha.reset(); // reset if the attempt fails
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      {/* Load reCAPTCHA v2 */}
      <Script
        src="https://www.google.com/recaptcha/api.js"
        async
        defer
        onError={() => setErrorMsg('Failed to load reCAPTCHA.')}
      />

      <h1>Register</h1>

      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

      <form onSubmit={handleRegister}>
        <div>
          <label>Name:</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
        </div>

        <div>
          <label>Email:</label>
          <input
            type="email"
            required
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder="example@example.com"
          />
        </div>

        <div>
          <label>Password:</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        {/* reCAPTCHA v2 checkbox widget */}
        <div style={{ marginTop: 12 }}>
          <div className="g-recaptcha" data-sitekey={siteKey} />
          <noscript>
            <div style={{ color: 'crimson', marginTop: 8 }}>
              JavaScript is required for reCAPTCHA.
            </div>
          </noscript>
        </div>

        <button type="submit" disabled={busy} style={{ marginTop: 12 }}>
          {busy ? 'Creating Account…' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}
