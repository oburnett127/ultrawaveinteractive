import "../styles/globals.css";
import Script from "next/script";
import { headers } from "next/headers";
import Providers from "./providers";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SalesChatbot from "../components/SalesChatbot";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const isProduction = process.env.NODE_ENV === "production";

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
  const h = headers();
  const nonce = h.get("x-csp-nonce") || "";

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.css"
        />
      </head>

      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

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

        {/* ✅ reCAPTCHA */}
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`}
          strategy="beforeInteractive"
          nonce={nonce}
        />

        <Providers nonce={nonce}>
          <Header />

          {/* SINGLE main element */}
          <main id="main-content">{children}</main>

          <SalesChatbot />
          <Footer />
        </Providers>

        {/* Cookie consent */}
        <Script
          src="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.js"
          strategy="afterInteractive"
          nonce={nonce}
        />
      </body>
    </html>
  );
}
