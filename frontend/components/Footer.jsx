import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  const year = new Date().getFullYear();

  const links = [
    { href: "/privacypolicy", label: "Privacy Policy" },
    { href: "/termsofservice", label: "Terms of Service" },
    { href: "/cookiepolicy", label: "Cookie Policy" },
  ];

  return (
    <footer
      className={styles.footer}
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className={styles.footerContent}>
        <ul className={styles.footerLinks}>
          {links.map(({ href, label }) => (
            <li key={href} className={styles.footerItem}>
              <Link href={href} className={styles.footerLink} prefetch={false}>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <p className={styles.footerText}>
          © {year} Ultrawave Interactive. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
