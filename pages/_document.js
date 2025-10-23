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
    return (
      <Html lang="en">
        <Head>
          {/* Osano Cookie Consent CSS */}
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.css"
          />
        </Head>
        <body>
          <Main />
          <NextScript nonce={nonce} />

          {/* Osano config script: must come BEFORE the loader */}
          <Script id="cookieconsent-init" strategy="afterInteractive">
            {`
              window.addEventListener("load", function(){
                window.cookieconsent.initialise({
                  "palette": {
                    "popup": {
                      "background": "#000"
                    },
                    "button": {
                      "background": "#f1d600"
                    }
                  },
                  "theme": "classic",
                  "position": "bottom",
                  "content": {
                    "message": "This website uses cookies to ensure you get the best experience.",
                    "dismiss": "Got it!",
                    "link": "Learn more",
                    "href": "/privacy-policy"
                  }
                });
              });
            `}
          </Script>

          {/* Osano external JS loader (non-blocking) */}
          <Script
            src="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.js"
            strategy="afterInteractive"
          />
        </body>
      </Html>
    );
  }
}
