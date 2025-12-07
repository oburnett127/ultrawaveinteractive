// pages/signout.jsx
"use client";

import { getSession } from "next-auth/react";
import { signOut } from "next-auth/react";

export default function SignOutPage() {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <main id="main-content" style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Are you sure you want to sign out?</h1>
      <button
        onClick={handleSignOut}
      >
        Sign Out
      </button>
    </main>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);

  // Not logged in → redirect to signin
  if (!session) {
    return {
      redirect: {
        destination: "/signin",
        permanent: false,
      },
    };
  }

  // Logged in but OTP not verified → redirect to OTP step
  if (!session.user?.otpVerified) {
    return {
      redirect: {
        destination: "/verifyotp",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
}
