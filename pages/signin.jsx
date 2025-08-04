import { useState } from 'react';
import { getCsrfToken, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function SignIn({ csrfToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (result.ok) {
      localStorage.setItem("otpEmail", email);

      const otpRes = await fetch("/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!otpRes.ok) {
        const otpErr = await otpRes.json();
        console.error("Failed to send OTP:", otpErr);
        return setErrorMsg("Failed to send OTP. Try again.");
      }
      
      router.push('/verifyotp');
    } else {
      setErrorMsg('Invalid email or password');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <h1>Sign In</h1>
      <form method="post" onSubmit={handleSubmit}>

        <div>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label>Password:</label>
          <input
            type="password"
            name="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

        <button type="submit">Login</button>
      </form>
    </div>
  );
}
