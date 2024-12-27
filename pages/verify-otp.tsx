import { useEffect, useState } from "react";
import { getSession, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import axios from "axios";
import { useCsrf } from "../components/CsrfContext";

export default function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isValidated, setIsValidated] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const { csrfToken, setCsrfToken } = useCsrf();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!router.query.token) {
      console.log('router.query.token is not set');
      return;
    }

    const authenticate = async () => {
      try {
        const isValid = await validateToken(
          router.query.token as string,
          backendUrl || "",
          csrfToken || "no-csrf-token-available"
        );

        if (isValid) {
          console.log('the token is valid');
          setIsValidated(true);
        } else {
          alert("Authentication failed. Please log in again.");
          router.push("/");
        }
      } catch (error) {
        console.error("Error during authentication:", error);
        alert("An error occurred. Please try again.");
        router.push("/");
      }
    };

    console.log('calling authenticate');
    authenticate();
  }, [router.query.token, backendUrl]);

  useEffect(() => {
    const refreshSession = async () => {
      const updatedSession = useSession();
      console.log("Refreshed Session: ", updatedSession);
    };
  
    refreshSession();
  }, []);

  useEffect(() => {
    console.log('before the if');
    if (isValidated && session?.user?.email && !otpSent) {
      console.log('before sendOTP');
      sendOTP(session.user.email);
      setOtpSent(true); // Prevent further calls
    }
  }, [isValidated, session]);

  async function validateToken(token: any, backendUrl: any, csrfCookieValue: any) {
    try {
      const csrfParts = csrfCookieValue.split("%7C");
      setCsrfToken(csrfParts[0]);

      const response = await axios.post(
        `${backendUrl}/validate-token`,
        { token },
        {
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfParts[0],
          },
          withCredentials: true,
        }
      );

      if (response.status === 429) {
        alert("Too many requests! Please try again later.");
        return false;
      }

      console.log('end of validateToken');
      return response.data.isValid;
    } catch (error: any) {
      console.error("Error validating token:", error.response?.data || error.message);
      return false;
    }
  }

  useEffect(() => {
    console.log("Session Status: ", status);
    console.log("Session Data: ", session);
  }, [status, session]);

  async function sendOTP(email: any) {
    try {
      const res = await fetch(`${backendUrl}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken as any,
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        console.log("failed to send otp.");
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
          "CSRF-Token": csrfToken as any,
        },
        credentials: "include",
        body: JSON.stringify({ otp }),
      });

      if (res.ok) {
        router.push("/payment");
      } else {
        const data = await res.json();
        throw new Error(data.message || "Invalid OTP.");
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
