import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

/**
 * <Protected otpRequired>
 * 
 * - Ensures user is logged in
 * - If otpRequired=true, ensures user completed OTP for this session
 * - Prevents flashing by blocking UI until state is known
 * - Only renders children when authorized
 */

export default function Protected({ children, otpRequired = false }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect logic
  useEffect(() => {
    if (status === "loading") return; // still loading session... DO NOT redirect!

    // 1) Not logged in → redirect to sign-in
    if (status === "unauthenticated" && !router.asPath.startsWith("/verifyotp")) {
      router.replace("/signin");
      return;
    }

    // 2) OTP required & not verified → redirect to /verifyotp
    if (otpRequired && status === "authenticated" && session?.user?.otpVerified !== true) {
      router.replace("/verifyotp");
      return;
    }
  }, [status, session, otpRequired, router]);

  // ---------------------------------------------------
  // Prevent flashing by blocking render until safe
  // ---------------------------------------------------

  // Not ready yet → show nothing
  if (status === "loading") return null;

  if (status === "unauthenticated" && !router.asPath.startsWith("/verifyotp")) return null;

  // OTP required but not verified → show nothing (redirect runs)
  if (otpRequired && status === "authenticated" && session?.user?.otpVerified !== true) return null;

  // Authorized — render content
  return <>{children}</>;
}
