import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function VerifyOTP() {
  const { data: session } = useSession();
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Automatically send the OTP when the page loads
  useEffect(() => {
    if (session?.user?.email && !otpSent) {
      sendOTP(session.user.email);
    }
  }, [session, otpSent]);

  async function sendOTP(email: string) {
    try {
      const res = await fetch(`${backendUrl}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send OTP.");
      }

      setOtpSent(true); // Mark OTP as sent
      console.log("OTP sent successfully to:", email);
    } catch (err: any) {
      console.error("Error sending OTP:", err.message);
      setError("Failed to send OTP. Please try again.");
    }
  }

  async function handleVerifyOTP() {
    try {
      const res = await fetch(`${backendUrl}/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp }),
      });

      if (res.ok) {
        // Redirect to payment page after successful OTP verification
        router.push("/payment");
      } else {
        const data = await res.json();
        throw new Error(data.message || "Invalid OTP.");
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Verify OTP</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input
        type="text"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />
      <button onClick={handleVerifyOTP}>Verify</button>
      {!otpSent && <p>Sending OTP to your email...</p>}
      {otpSent && <p>Check your email for the OTP.</p>}
    </div>
  );
}
