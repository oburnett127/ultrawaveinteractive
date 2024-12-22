import { useState } from 'react';

export default function VerifyOTP() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  async function handleVerify() {
    const res = await fetch(`${backendUrl}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', otp }), // Replace with user's email
    });

    if (!res.ok) {
      setError('Invalid or expired OTP');
      return;
    }

    alert('OTP verified successfully!');
    window.location.href = '/payment'; // Redirect to payment page
  }

  return (
    <div>
      <h1>Verify OTP</h1>
      <input
        type="text"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />
      <button onClick={handleVerify}>Verify</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
