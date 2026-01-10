// app/dashboard/page.jsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions.js";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // ❌ Not logged in → redirect before render
  if (!session) {
    redirect("/signin");
  }

  // ✅ Logged in (OTP not required here)
  return <DashboardClient session={session} />;
}
