// pages/_document.js
import Document, { Html, Head, Main, NextScript } from "next/document";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);

    // Read nonce from Express
    const nonce = ctx?.res?.locals?.cspNonce || "";

    return { ...initialProps, nonce };
  }

  render() {
    const { nonce } = this.props;
    const isProduction = process.env.NODE_ENV === "production";

    return (
      <Html lang="en">
        <Head nonce={nonce}>
          {/* ✅ Square Payment SDK */}
          <script
            src={
              isProduction
                ? "https://web.squarecdn.com/v1/square.js"
                : "https://sandbox.web.squarecdn.com/v1/square.js"
            }
            async
            defer
            nonce={nonce}
          />

          {/* ✅ Google reCAPTCHA (ONE script only) */}
          <script
            src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`}
            async
            defer
            nonce={nonce}
          />

          {/* ✅ Cookie Consent CSS */}
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.css"
          />
        </Head>

        <body>
          {/* Prevent flash of wrong theme */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('uw-theme');
                  if (saved) {
                    document.documentElement.setAttribute('data-theme', saved);
                  }
                } catch (e) {}
              })();
            `,
            }}
          />
          
          <Main />

          {/* 
            ❗ DO NOT pass nonce to NextScript. 
            It is ignored and breaks hydration.
          */}
          <NextScript />

          {/* 
            CookieConsent JS (external — allowed) 
          */}
          <script
            src="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.js"
            async
            defer
            nonce={nonce}
          />

          {/* 
            CookieConsent init — inline must be nonced.
            This is safe.
          */}
          <script
            id="cookieconsent-init"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                window.addEventListener("load", function () {
                  if (window.cookieconsent) {
                    window.cookieconsent.initialise({
                      palette: {
                        popup: { background: "#000" },
                        button: { background: "#f1d600" }
                      },
                      theme: "classic",
                      position: "bottom",
                      content: {
                        message: "This website uses cookies to ensure you get the best experience.",
                        dismiss: "Got it!",
                        link: "Learn more",
                        href: "/privacypolicy"
                      }
                    });
                  }
                });
              `,
            }}
          />
        </body>
      </Html>
    );
  }
}
