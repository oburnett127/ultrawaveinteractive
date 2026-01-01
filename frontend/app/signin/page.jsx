// app/signin/page.jsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions.cjs";
import SignInForm from "@/components/SignInForm";

export const metadata = {
  title: "Sign In | Ultrawave Interactive",
  description: "Sign in to your Ultrawave Interactive account.",
};

export default async function SignInPage() {
  const session = await getServerSession(authOptions);

  // ✅ Already logged in → dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  // ❌ Not logged in → render sign-in form
  return (
    <main id="main-content">
      <SignInForm />
    </main>
  );
}
