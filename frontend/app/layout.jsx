import "../styles/globals.css";
import Script from "next/script";
import Providers from "./providers";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SalesChatbot from "../components/SalesChatbot";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const isProduction = process.env.NODE_ENV === "production";

export default function RootLayout({ children }) {
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

        {/* Square */}
        <Script
          src={
            isProduction
              ? "https://web.squarecdn.com/v1/square.js"
              : "https://sandbox.web.squarecdn.com/v1/square.js"
          }
          strategy="afterInteractive"
        />

        {/* reCAPTCHA */}
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`}
          strategy="afterInteractive"
        />

        <Providers>
          <Header />
          <main id="main-content">{children}</main>
          <SalesChatbot />
          <Footer />
        </Providers>

        {/* Cookie consent */}
        <Script
          src="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
