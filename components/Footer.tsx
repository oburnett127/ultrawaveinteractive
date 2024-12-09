import React from 'react';
import './Footer.module.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <ul className="footer-links">
          <li>
            <a href="/privacy-policy" className="footer-link">
              Privacy Policy
            </a>
          </li>
          <li>
            <a href="/terms-of-service" className="footer-link">
              Terms of Service
            </a>
          </li>
          <li>
            <a href="/cookie-policy" className="footer-link">
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
