// pages/signout.jsx
"use client";

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
