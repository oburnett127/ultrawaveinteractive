"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;

    // 1) Not logged in → redirect to sign-in
    if (
      status === "unauthenticated" &&
      !pathname.startsWith("/verifyotp")
    ) {
      router.replace("/signin");
      return;
    }

    // 2) OTP required & not verified → redirect to /verifyotp
    if (
      otpRequired &&
      status === "authenticated" &&
      session?.user?.otpVerified !== true
    ) {
      router.replace("/verifyotp");
    }
  }, [status, session, otpRequired, pathname, router]);

  // --------------------------------------------
  // Prevent flashing by blocking render
  // --------------------------------------------

  if (status === "loading") return null;

  if (
    status === "unauthenticated" &&
    !pathname.startsWith("/verifyotp")
  ) {
    return null;
  }

  if (
    otpRequired &&
    status === "authenticated" &&
    session?.user?.otpVerified !== true
  ) {
    return null;
  }

  return <>{children}</>;
}