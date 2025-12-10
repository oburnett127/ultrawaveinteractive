import React from "react";
import Link from "next/link";
import styles from "./Footer.module.css";

/**
 * A resilient, accessible footer with error boundaries and defensive rendering.
 */
class FooterErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Footer rendering error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <footer className={styles.footerFallback || "footer-fallback"}>
          <p style={{ color: "#b00", padding: "10px" }}>
            ⚠️ Footer temporarily unavailable
          </p>
        </footer>
      );
    }

    return this.props.children;
  }
}

const Footer = () => {
  // Defensive year calculation
  const currentYear = new Date().getFullYear() || "2025";

  // Safe link list (to avoid hardcoding & future scalability)
  const links = [
    { href: "/privacypolicy", label: "Privacy Policy" },
    { href: "/termsofservice", label: "Terms of Service" },
    { href: "/cookiepolicy", label: "Cookie Policy" },
  ];

  return (
    <FooterErrorBoundary>
      <footer
        className={styles.footer}
        role="contentinfo"
        aria-label="Site footer"
      >
        <div className={styles.footerContent}>
          <ul className={styles.footerLinks}>
            {links.map(({ href, label }) => (
              <li key={href} className={styles.footerItem}>
                <Link
                  href={href}
                  className={styles.footerLink}
                  aria-label={`Read our ${label}`}
                  prefetch={false}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <p className={styles.footerText}>
            © {currentYear} Ultrawave Interactive. All rights reserved.
          </p>
        </div>
      </footer>
    </FooterErrorBoundary>
  );
};

export default Footer;
