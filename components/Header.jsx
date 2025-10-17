// components/Header.jsx
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.85)',  // semi-transparent black
        backdropFilter: 'blur(6px)',       // subtle blur behind
        borderBottom: '1px solid #333',    // optional bottom border
      }}
    >
      {/* Left spacer */}
      <div></div>

      {/* Centered heading */}
      <h1 style={{ margin: 0, fontSize: '1.8rem', textAlign: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>
          Ultrawave Interactive Web Design
        </Link>
      </h1>

      {/* Right-aligned session controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
        {session ? (
          <>
            <span style={{ color: 'white', fontSize: '0.9rem' }}>{session.user.email}</span>
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
