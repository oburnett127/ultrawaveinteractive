// components/Header.jsx
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className={"header-text"}>
      {/* Left spacer */}
      <div></div>

      {/* Centered heading */}
      <h1 className={"centered-heading"}>
        <Link href="/" className={"white-text"}>
          Ultrawave Interactive Web Design
        </Link>
      </h1>

      {/* Right-aligned session controls */}
      <div className={"right-aligned-controls"}>
        {session ? (
          <>
            <span className={"email-text"}>{session.user.email}</span>
            <button onClick={() => signOut()}>Sign Out</button>
          </>
        ) : (
          <>
            <Link href="/auth/signin">
              <button>Sign In</button>
            </Link>
            <Link href="/register">
              <button>Create Account</button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
