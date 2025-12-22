"use client";

// components/Header.jsx
import React, { useState, useRef, useEffect } from "react";
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

  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const closeMenu = () => setMenuOpen(false);

  const toggleMenu = () => setMenuOpen((menuOpen) => !menuOpen);

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

  // Close menu if user clicks outside it
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menu with escape key
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  function itemClickAction() {
    setMenuOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <HeaderErrorBoundary>
      <header className={styles.header}>
         <nav className={styles.nav} aria-label="Main">
            {/* HAMBURGER ICON */}
            <button
              ref={buttonRef}
              className={styles.hamburger}
              aria-expanded={menuOpen}
              aria-controls="main-menu"
              aria-label="Menu"
              onClick={toggleMenu}
            >
              <span className={styles.line}></span>
              <span className={styles.line}></span>
              <span className={styles.line}></span>
            </button>

            <Link className={styles.brand} href="/">
              Ultrawave Interactive Web Design
            </Link>
            {session?.user?.email && (
                <span className={styles.userEmail}>
                  {session.user.email}
                </span>
            )}
            <ul
              ref={menuRef}
              id="main-menu"
              className={`${styles.menu} ${menuOpen ? styles.open : ""}`}
              role="menu"
            >
              <li role="none">
                <Link role="menuitem" href="/" onClick={itemClickAction}>
                  Home
                </Link>
              </li>
            {status === "unauthenticated" && (
                <>
                  <li role="none">
                    <Link role="menuitem" href="/signin" onClick={itemClickAction}>
                      Sign In
                    </Link>
                  </li>
                </>
              )}
            {status === "authenticated" && (
                <>
                  <li role="none">
                    <button
                      className={styles.btnNoPadding}
                      role="menuitem"
                      onClick={() => {
                        itemClickAction();
                        signOut();
                      }}
                    >Sign Out</button>
                  </li>
                  <li role="none">
                    <Link role="menuitem" href="/account/change-password" onClick={itemClickAction}>
                      Change Password
                    </Link>
                  </li>
                  <li role="none">
                    <Link role="menuitem" href="/squarepaymentpage" onClick={itemClickAction}>
                      Make Payment
                    </Link>
                  </li>
                </>
              )}
          </ul>
        </nav>
      </header>
    </HeaderErrorBoundary>
  );
}
