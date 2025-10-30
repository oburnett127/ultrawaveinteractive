// pages/_document.js
import Document, { Html, Head, Main, NextScript } from "next/document";

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    const nonce = ctx?.res?.locals?.cspNonce || "";
    return { ...initialProps, nonce };
  }

  render() {
    const { nonce } = this.props;
    const isProduction = process.env.NODE_ENV === "production";

    return (
      <Html lang="en">
        <Head nonce={nonce}>
          {/* ✅ Cookie Consent CSS */}
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.css"
          />

          {/* ✅ Google reCAPTCHA */}
          <script
            src="https://www.google.com/recaptcha/api.js"
            async
            defer
            nonce={nonce}
          ></script>

          {/* ✅ Square Payment SDK (auto switch for sandbox vs prod) */}
          <script
            src={
              isProduction
                ? "https://web.squarecdn.com/v1/square.js"
                : "https://sandbox.web.squarecdn.com/v1/square.js"
            }
            async
            defer
            nonce={nonce}
          ></script>
        </Head>

        <body>
          <Main />

          {/* ✅ Nonced Next.js inline scripts for hydration */}
          <NextScript nonce={nonce} />

          {/* ✅ Osano CookieConsent JS (must load before init) */}
          <script
            src="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.js"
            async
            defer
            nonce={nonce}
          ></script>

          {/* ✅ Osano CookieConsent Init (inline, nonced) */}
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
          ></script>
        </body>
      </Html>
    );
  }
}
