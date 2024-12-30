import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import session from '../types/next-auth';

export default function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const { data: session, status } = useSession();

  // Ensure user is authenticated before accessing this page
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/"); // Redirect to home if not authenticated
    }
  }, [status]);

  // Automatically send OTP when the user is authenticated
  // Automatically send OTP when the user is authenticated
useEffect(() => {
  console.log("Status:", status, "Session:", session); // Debugging log

  if (session && session.user) {
    console.log("Access Token:", session.user.accessToken);
  }

  if (status === "authenticated" && session?.user?.email && !otpSent) {
    sendOTP(session.user.email);
    setOtpSent(true); // Prevent duplicate OTP sending
  }
}, [status, session]);

async function sendOTP(email: string) {
  try {
    const res = await fetch(`${backendUrl}/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Replaces `withCredentials: true`
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      throw new Error("Failed to send OTP.");
    }

    console.log("OTP sent successfully.");
  } catch (error) {
    console.error("Error sending OTP:", error);
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
      credentials: "include", // Replaces `withCredentials: true`
      body: JSON.stringify({ otp }),
    });

    if (res.ok) {
      router.push("/payment"); // Redirect to payment page on success
    } else {
      throw new Error("Invalid OTP.");
    }
  } catch (err: any) {
    console.error("Error verifying OTP:", err.message);
    setError(err.message || "Failed to verify OTP. Please try again.");
  }
}

  return (
    <div>
      <h1>Verify OTP</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input
        type="text"
        placeholder="Enter one-time password"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />
      <button onClick={handleVerifyOTP}>Verify</button>
      {!otpSent && <p>Sending One Time Password to your email...</p>}
      {otpSent && <p>Check your email for the One Time Password.</p>}
    </div>
  );
}
