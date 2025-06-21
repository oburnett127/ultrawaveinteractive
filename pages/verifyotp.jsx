import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const { data: session, update, status } = useSession();

  // Ensure user is authenticated before accessing this page
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/"); // Redirect to home if not authenticated
    }
  }, [status, router]);

  // Automatically send OTP when the user is authenticated
  useEffect(() => {
    // if (session && session.user) {
    //   //console.log("Access Token:", session.user.accessToken);
    // }

    if (status === "authenticated" && session?.user?.email && !otpSent) {
      console.log("Session:", session);
      console.log("session.user.idToken:", session?.user?.idToken);
      sendOTP(session.user.email);
      setOtpSent(true); // Prevent duplicate OTP sending
    }
  }, [status, session, otpSent]);

  async function sendOTP(email) {
    try {
      console.log(session?.user.idToken);
      const res = await fetch(`${backendUrl}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.user.idToken}`,
        },
        credentials: "include", // Replaces `withCredentials: true`
        body: JSON.stringify({ email }),
      });

      //console.log('from verify-otp after send-otp, session?.idToken: ', session?.user.idToken);

      if (!res.ok) {
        throw new Error("Failed to send OTP.");
      }

      //console.log("OTP sent successfully.");
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
          Authorization: `Bearer ${session?.user.idToken}`,
        },
        credentials: "include",
        body: JSON.stringify({ email: session?.user.email, otp }),
      });

      //console.log('from verify-otp, session?.idToken: ', session?.user.idToken);

      if (res.ok) {
        // Update token via API route
        await fetch("/api/auth/update-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

          // Refresh session
        const sessionRes = await fetch("/api/auth/session", {
          method: "GET",
          headers: { "Cache-Control": "no-cache" },
        });

        const sessionData = await sessionRes.json();
        //console.log("Session data after refresh:", sessionData);

        router.push("/payment");
      } else {
        throw new Error("Invalid OTP.");
      }
    } catch (err) {
      console.error("Error verifying OTP:", err.message);
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

export default VerifyOTP;