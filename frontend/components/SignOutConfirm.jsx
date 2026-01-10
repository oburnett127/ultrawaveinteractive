"use client";

import { signOut } from "next-auth/react";
import "@/app/signout/signout.css";

export default function SignOutConfirm() {
  function handleSignOut() {
    signOut({ callbackUrl: "/" });
  }

  return (
    <>
      <h1>Are you sure you want to sign out?</h1>
      <button
        type="button"
        className="signout-button"
        onClick={handleSignOut}
      >
        Sign Out
      </button>
    </>
  );
}
