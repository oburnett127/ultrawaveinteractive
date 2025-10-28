// pages/_document.js
import Document, { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initial = await Document.getInitialProps(ctx);
    const nonce = ctx?.res?.locals?.cspNonce || "";
    return { ...initial, nonce };
  }

  render() {
    const { nonce } = this.props;
    const isProduction = process.env.NODE_ENV === "production";

    return (
      <Html lang="en">
        <Head>
          {/* ✅ Google reCAPTCHA */}
          <Script
            src="https://www.google.com/recaptcha/api.js"
            strategy="afterInteractive"
            async
            defer
            nonce={nonce}
          />

          {/* ✅ Square Payment SDK - Automatically picks sandbox or production based on env */}
          <Script
            src={
              isProduction
                ? "https://web.squarecdn.com/v1/square.js"
                : "https://sandbox.web.squarecdn.com/v1/square.js"
            }
            strategy="afterInteractive"
            nonce={nonce}
          />

          {/* ✅ Osano Cookie Consent CSS */}
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.css"
          />
        </Head>
        <body>
          <Main />
          <NextScript nonce={nonce} />

          {/* ✅ Osano initialisation (inline script with nonce) */}
          <Script id="cookieconsent-init" strategy="afterInteractive" nonce={nonce}>
            {`
              window.addEventListener("load", function(){
                window.cookieconsent.initialise({
                  palette: {
                    popup: {
                      background: "#000"
                    },
                    button: {
                      background: "#f1d600"
                    }
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
              });
            `}
          </Script>

          {/* ✅ Osano external JS (non-blocking) */}
          <Script
            src="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.js"
            strategy="afterInteractive"
            nonce={nonce}
          />
        </body>
      </Html>
    );
  }
}
