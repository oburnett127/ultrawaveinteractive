import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED_PATHS = ["/payment"]; // add more paths that require OTP

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p));

  // If not a protected route, no special handling
  if (!isProtected && pathname !== "/verifyotp") return NextResponse.next();

  // Require a signed-in session for protected & verifyotp pages
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const mfa = req.cookies.get("mfa")?.value === "1";

  // If user tries to access protected page without MFA, send to verifyotp
  if (isProtected && !mfa) {
    const url = new URL("/verifyotp", req.url);
    return NextResponse.redirect(url);
  }

  // If user already verified and hits /verifyotp, send to /payment
  if (pathname === "/verifyotp" && mfa) {
    return NextResponse.redirect(new URL("/payment", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/payment",
    "/verifyotp",
  ],
};
