import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function VerifyOTP() {
  const [otp, setOtp]               = useState("");
  const [error, setError]           = useState("");
  const [otpSent, setOtpSent]       = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);

  const router              = useRouter();
  const backendUrl          = process.env.NEXT_PUBLIC_BACKEND_URL;
  const { data: session, status, update } = useSession();

  /* ────────────────────────────────────────────────
     1. Redirect if still unauthenticated
  ───────────────────────────────────────────────── */
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  /* ────────────────────────────────────────────────
     2. Auto-send OTP once the user is logged in
  ───────────────────────────────────────────────── */
  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.email &&
      !otpSent
    ) {
      sendOTP(session.user.email);
    }
  }, [status, session, otpSent]);

  async function sendOTP(email) {
    try {
      await fetch(`${backendUrl}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.user?.idToken}`,
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      setOtpSent(true);
    } catch (err) {
      console.error("Error sending OTP:", err);
      setError("Failed to send OTP. Please try again.");
    }
  }

  /* ────────────────────────────────────────────────
     3. Handle Verify button
  ───────────────────────────────────────────────── */
  async function handleVerifyOTP() {
    if (status !== "authenticated" || isSubmitting) return;

    setSubmitting(true);
    setError("");

    try {
      /* 3-A  Verify OTP */
      const verify = await fetch(`${backendUrl}/verify-otp`, {
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
      if (!verify.ok) throw new Error(await verify.text());

      /* 3-B  Flag user as verified in DB */
      const save = await fetch("/api/update-token", {
        method: "GET",
        credentials: "include",
      });
      if (!save.ok) throw new Error(await save.text());

      /* 3-C  Refresh JWT cookie so otpVerified === true */
      await update();                 // triggers JWT callback

      /* 3-D  Go to payment */
      router.replace("/payment");
    } catch (err) {
      console.error("OTP flow failed:", err);
      setError(err.message ?? "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ────────────────────────────────────────────────
     4. Render
  ───────────────────────────────────────────────── */
  return (
    <div>
      <h2>Verify OTP</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {!otpSent && <p>Sending One-Time Password to your email…</p>}
      {otpSent  && <p>Check your inbox for the One-Time Password.</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleVerifyOTP();
        }}
      >
        <input
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Verifying…" : "Verify OTP"}
        </button>
      </form>
    </div>
  );
}
