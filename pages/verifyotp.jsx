import { useState } from "react";
import { useRouter } from "next/router";
import { signIn, getSession } from "next-auth/react";

export default function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const email = localStorage.getItem("otpEmail");

      const res = await fetch("/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp }), // ✅ now includes email
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "OTP verification failed");
      }

      // 🔄 Manually refresh session
      const session = await getSession(); // 👈 this triggers refetching the session

      if (session?.user?.email) {
        router.replace("/payment");
      } else {
        throw new Error("Could not refresh session – please reload the page.");
      }
    } catch (err) {
      console.error("OTP verification failed:", err);
      setError(err.message || "Failed to verify OTP");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <h1>Verify OTP</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>OTP:</label>
          <input
            type="text"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Verify</button>
      </form>
    </div>
  );
}
