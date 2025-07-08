import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const { data: session, update, status } = useSession();

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Automatically send OTP if not already sent
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email && !otpSent) {
      sendOTP(session.user.email);
      setOtpSent(true);
    }
  }, [status, session, otpSent]);

  async function sendOTP(email) {
    try {
      const res = await fetch(`${backendUrl}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.user?.idToken}`,
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error("Failed to send OTP.");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError("Failed to send OTP. Please try again.");
    }
  }

  async function handleVerifyOTP() {
    if (status !== "authenticated" || isSubmitting) {
      console.warn("User not authenticated or already submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Verify OTP with backend
      const verifyRes = await fetch(`${backendUrl}/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.idToken}`,
        },
        credentials: "include",
        body: JSON.stringify({
          email: session.user.email,
          otp,
        }),
      });

      if (!verifyRes.ok) {
        const errMsg = await verifyRes.text();
        throw new Error("Invalid OTP: " + errMsg);
      }

      // Step 2: Update otpVerified in DB
      const tokenRes = await fetch("/api/update-token", {
        method: "POST",
        credentials: "include",
      });

      if (!tokenRes.ok) {
        const errMsg = await tokenRes.text();
        throw new Error("Failed to update otpVerified: " + errMsg);
      }

      // Step 3: Refresh session and redirect
      const updatedSession = await update();

      if (updatedSession?.user?.otpVerified === true) {
        router.push("/payment");
      } else {
        throw new Error("Session update failed to reflect OTP verification.");
      }
    } catch (err) {
      console.error("Error verifying OTP:", err.message);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h2>Verify OTP</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleVerifyOTP();
        }}
      >
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter OTP"
          required
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Verifying..." : "Verify OTP"}
        </button>

        {!otpSent && <p>Sending One Time Password to your email...</p>}
        {otpSent && <p>Check your email for the One Time Password.</p>}
      </form>
    </div>
  );
};

export default VerifyOTP;