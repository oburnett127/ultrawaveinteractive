import React from 'react';
import './Footer.module.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <ul className="footer-links">
          <li>
            <a href="/privacypolicy" className="footer-link">
              Privacy Policy
            </a>
          </li>
          <li>
            <a href="/termsofservice" className="footer-link">
              Terms of Service
            </a>
          </li>
          <li>
            <a href="/cookiepolicy" className="footer-link">
              Cookie Policy
            </a>
          </li>
        </ul>
        <p className="footer-text">© {new Date().getFullYear()} Ultrawave Interactive. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
