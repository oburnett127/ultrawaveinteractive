import { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';

export default function Register() {
  const [email, setEmail]       = useState('');
  const [name, setName]         = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router                  = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });

      let data;
      try {
        data = await res.json(); // only try parsing JSON after checking content-type
      } catch (jsonErr) {
        throw new Error('Unexpected server error');
      }

      if (!res.ok) {
        const errorText = data?.error || 'Registration failed';
        throw new Error(errorText);
      }

      // ✅ Auto-login using credentials provider
      const loginResult = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (loginResult.ok) {
        router.push('/verifyotp');
      } else {
        throw new Error('Account created but login failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'Registration failed');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

        <button type="submit">Create Account</button>
      </form>
    </div>
  );
}
