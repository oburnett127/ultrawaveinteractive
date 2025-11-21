// components/Header.jsx
import React, { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import styles from "./Header.module.css";

/**
 * Error boundary wrapper — keeps the header from crashing the app
 */
class HeaderErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Header rendering error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <header className={styles.headerFallback}>
          <h1>Ultrawave Interactive</h1>
        </header>
      );
    }
    return this.props.children;
  }
}

export default function Header() {
  const { data: session, status } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut({ redirect: false });
    } catch (err) {
      console.error("Sign-out error:", err);
      alert("Sign-out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const renderControls = () => {
    if (status === "loading") {
      return <span className={styles.loadingText}>Loading session...</span>;
    }

    if (session?.user) {
      return (
        <>
          <span
            className={styles.emailText}
            title={session.user.email || "Logged-in user"}
          >
            {session.user.email}
          </span>
          <button
            onClick={() => window.location.href = "/dashboard"}
            className={styles.button}
            aria-label="Dashboard"
          >
            {"Dashboard"}
          </button>
          <button
            onClick={handleSignOut}
            className={styles.button}
            disabled={signingOut}
            aria-label="Sign out"
          >
            {signingOut ? "Signing Out..." : "Sign Out"}
          </button>
        </>
      );
    }

    return (
      <>
        <Link href="/auth/signin" className={styles.link}>
          <button className={styles.button} aria-label="Sign in">
            Sign In
          </button>
        </Link>
        <Link href="/register" className={styles.link}>
          <button className={styles.button} aria-label="Create an account">
            Create Account
          </button>
        </Link>
      </>
    );
  };

  return (
    <HeaderErrorBoundary>
      <header className={styles.header} role="banner" aria-label="Site header">
        {/* Left spacer for layout symmetry */}
        <div className={styles.leftSpacer}></div>

        {/* Center heading */}
        <h1 className={styles.centeredHeading}>
          <Link href="/" className={styles.homeLink} aria-label="Home">
            Ultrawave Interactive Web Design
          </Link>
        </h1>

        {/* Right-aligned controls */}
        <div className={styles.rightControls}>{renderControls()}</div>
      </header>
    </HeaderErrorBoundary>
  );
}
