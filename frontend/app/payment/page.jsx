// app/payment/page.jsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import SquarePaymentPage from "@/components/SquarePaymentPage";
import { authOptions } from "@/lib/authOptions.js";

// 🚀 Server Component (default in App Router)
export default async function PaymentPage() {
  const session = await getServerSession(authOptions);

  // ❌ Not logged in
  if (!session) {
    redirect("/signin");
  }

  // ❌ OTP not verified
  if (!session.user?.otpVerified) {
    redirect("/verifyotp");
  }

  // ✅ Auth + OTP verified
  return (
    <main id="main-content">
      <SquarePaymentPage session={session} />
    </main>
  );
}
