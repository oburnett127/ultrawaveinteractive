// app/blog/create/page.jsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions.js";
import CreatePostClient from "./CreatePostClient";

export default async function CreatePostPage() {
  const session = await getServerSession(authOptions);

  // Not logged in
  if (!session) {
    redirect("/signin");
  }

  // Logged in but OTP not verified
  if (!session.user?.otpVerified) {
    redirect("/verifyotp");
  }

  return <CreatePostClient />;
}
