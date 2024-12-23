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
  const [tttoken, setTttoken] = useState("");
  
  useEffect(() => {
    const fetchCsrfAndAuthenticate = async () => {
      // if (!queryToken) {
      //   console.warn("No token found in URL.");
      //   return;
      // }

      try {
        //console.log('verify-otp: router.query.token: ', router.query.token);

        // Fetch CSRF token from backend
        //const res = await fetch(`${backendUrl}/csrf-token`, {
          const res = await fetch('/api/auth/csrf', {
          credentials: "include", // Ensures cookies are sent with the request
        });
        if (!res.ok) throw new Error("Failed to fetch CSRF token");
        const data = await res.json();

        console.log("Fetched CSRF token:", data.csrfToken);

        // Authenticate user using token and CSRF token
        const isValid = await validateToken(router.query.token as string, backendUrl || "", data.csrfToken);
        if (isValid) {
        } else {
          alert("Authentication failed. Please log in again.");
          router.push("/"); // Redirect to homepage or login page
        }
      } catch (error) {
        console.error("Error during authentication:", error);
        alert("An error occurred. Please try again.");
        router.push("/"); // Redirect to homepage or login page
      }
    };

    if (router.query.token) {
      fetchCsrfAndAuthenticate();
    }
  }, [router.query.token, backendUrl]);

  async function validateToken(token: string, backendUrl: string, csrfToken: string): Promise<boolean> {
    try {
      const res = await fetch(`${backendUrl}/validate-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "csrf-token": csrfToken,
        },
        body: JSON.stringify({ token }),
      });
  
      if (!res.ok) {
        console.error("Token validation failed:", res.statusText);
        return false;
      }
  
      const data = await res.json();
      return data.isValid; // Assume your backend returns `isValid: true` if valid
    } catch (error) {
      console.error("Error validating token:", error);
      return false;
    }
  }

  // Automatically send the OTP when the page loads
  // useEffect(() => {
  //   if (session?.user?.email && !otpSent) {
  //     sendOTP(session.user.email);
  //   }
  // }, [session, otpSent]);

  // async function sendOTP(email: string) {
  //   try {
  //     const res = await fetch(`${backendUrl}/send-otp`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         'CSRF-Token': csrfToken as any,
  //       },
  //       credentials: 'include',
  //       body: JSON.stringify({ email }),
  //     });

  //     if (!res.ok) {
  //       const data = await res.json();
  //       throw new Error(data.message || "Failed to send OTP.");
  //     }

  //     setOtpSent(true); // Mark OTP as sent
  //     console.log("OTP sent successfully to:", email);
  //   } catch (err: any) {
  //     console.error("Error sending OTP:", err.message);
  //     setError("Failed to send OTP. Please try again.");
  //   }
  // }

  async function handleVerifyOTP() {
    try {
      const res = await fetch(`${backendUrl}/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'CSRF-Token': tttoken as any,
        },
        credentials: 'include',
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
