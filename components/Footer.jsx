import React from 'react';
import './Footer.module.css';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <ul className="footer-links">
          <li>
            <Link href="/privacypolicy" className="footer-link">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link href="/termsofservice" className="footer-link">
              Terms of Service
            </Link>
          </li>
          <li>
            <Link href="/cookiepolicy" className="footer-link">
              Cookie Policy
            </Link>
          </li>
        </ul>
        <p className="footer-text">© {new Date().getFullYear()} Ultrawave Interactive. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
