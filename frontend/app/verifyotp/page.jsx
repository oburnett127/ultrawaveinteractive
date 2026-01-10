// app/verifyotp/page.jsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions.js";
import VerifyOTPForm from "@/components/VerifyOTPForm";

export const metadata = {
  title: "Verify OTP | Ultrawave Interactive",
};

export default async function VerifyOTPPage() {
  const session = await getServerSession(authOptions);

  // ❌ Not logged in
  if (!session?.user) {
    redirect("/signin");
  }

  // ❌ Already OTP verified → should not be here
  if (session.user.otpVerified) {
    redirect("/dashboard");
  }

  // ✅ Logged in, OTP not verified
  return (
    <main id="main-content">
      <VerifyOTPForm />
    </main>
  );
}
