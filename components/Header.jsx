// components/Header.jsx
import React, { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import styles from "./Header.module.css";

class HeaderErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("Header error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return <header className={styles.headerFallback}>Error loading header</header>;
    }
    return this.props.children;
  }
}

export default function Header() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut({ redirect: true, callbackUrl: "/" });
    } catch (err) {
      console.error("Sign-out error:", err);
      alert("Sign-out failed.");
    } finally {
      setSigningOut(false);
    }
  };

  const menuItems = (
  <nav className={`${styles.menu} ${menuOpen ? styles.open : ""}`}>
    {/* Sign In / Sign Out */}
    {session?.user ? (
      <button
        onClick={() => {
          closeMenu();
          handleSignOut();
        }}
        className={styles.menuItem}
      >
        {signingOut ? "Signing Out..." : "Sign Out"}
      </button>
    ) : (
      <Link
        href="/auth/signin"
        className={styles.menuItem}
        onClick={closeMenu}
      >
        Sign In
      </Link>
    )}

    <Link
        href="/"
        className={styles.menuItem}
        onClick={closeMenu}
      >
        Home
      </Link>

    {/* Change Password */}
    <Link
      href="/account/change-password"
      className={styles.menuItem}
      onClick={closeMenu}
    >
      Change Password
    </Link>

    {/* Make Payment */}
    <Link
      href="/squarepaymentpage"
      className={styles.menuItem}
      onClick={closeMenu}
    >
      Make Payment
    </Link>
  </nav>
);


  return (
    <HeaderErrorBoundary>
      <header className={styles.header}>
        {/* HAMBURGER ICON */}
        <button
          className={styles.hamburger}
          onClick={toggleMenu}
          aria-label="Open Menu"
        >
          <span className={styles.line}></span>
          <span className={styles.line}></span>
          <span className={styles.line}></span>
        </button>

        {/* Centered Title */}
        <h1 className={styles.title}>
          <Link href="/" className={styles.homeLink}>
            Ultrawave Interactive Web Design
          </Link>
        </h1>

        {/* Right Spacer (keeps title centered) */}
        {/* Right side: user email */}
        <div className={styles.rightSide}>
          {session?.user?.email && (
            <span className={styles.emailText}>{session.user.email}</span>
          )}
        </div>


        {/* Slide-down Menu */}
        {menuItems}
      </header>
    </HeaderErrorBoundary>
  );
}
