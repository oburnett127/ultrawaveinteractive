// app/changePassword/page.jsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import ChangePasswordClient from "./ChangePasswordClient";
import { authOptions } from "@/lib/authOptions.js"; // adjust path if needed

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions);

  // Not logged in → /signin
  if (!session) {
    redirect("/signin");
  }

  // Logged in but OTP not verified → /verifyotp
  if (!session.user?.otpVerified) {
    redirect("/verifyotp");
  }

  // Authenticated & OTP verified
  return <ChangePasswordClient />;
}
