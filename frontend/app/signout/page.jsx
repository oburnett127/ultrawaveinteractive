// app/signout/page.jsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions.cjs";
import SignOutConfirm from "../components/SignOutConfirm";

export const metadata = {
  title: "Sign Out | Ultrawave Interactive",
};

export default async function SignOutPage() {
  const session = await getServerSession(authOptions);

  // ❌ Not logged in → go home
  if (!session) {
    redirect("/");
  }

  // ✅ Logged in → show confirmation
  return (
    <main id="main-content" className="signout-container">
      <SignOutConfirm />
    </main>
  );
}
