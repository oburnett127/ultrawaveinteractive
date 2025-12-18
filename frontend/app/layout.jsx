import "../styles/globals.css";
import Script from "next/script";
import { headers } from "next/headers";
import Providers from "./providers";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SalesChatbot from "../components/SalesChatbot";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const isProduction = process.env.NODE_ENV === "production";

/**
 * ✅ App Router metadata (replaces <Head>)
 */
export const metadata = {
  metadataBase: new URL("https://ultrawaveinteractive.com"),
  title: {
    default: "Ultrawave Interactive Web Design",
    template: "%s | Ultrawave Interactive",
  },
  description:
    "High-performance custom websites built with Next.js and Node.js for small businesses.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  const nonce = headers().get("x-csp-nonce") || "";

  return (
    <html lang="en">
      <head>
        {/* ✅ Cookie Consent CSS */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.css"
        />

        {/* ✅ Square SDK */}
        <Script
          src={
            isProduction
              ? "https://web.squarecdn.com/v1/square.js"
              : "https://sandbox.web.squarecdn.com/v1/square.js"
          }
          strategy="beforeInteractive"
          nonce={nonce}
        />

        {/* ✅ Google reCAPTCHA */}
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`}
          strategy="beforeInteractive"
          nonce={nonce}
        />
      </head>

      <body>
        {/* 👇 Skip nav FIRST focusable element */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <Providers nonce={nonce}>
          <Header />

          {/* 👇 REQUIRED for skip link */}
          <main id="main-content">
            {children}
          </main>

          <SalesChatbot />
          <Footer />
        </Providers>

        {/* ✅ CookieConsent JS */}
        <Script
          src="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.js"
          strategy="afterInteractive"
          nonce={nonce}
        />
      </body>
    </html>
  );
}
