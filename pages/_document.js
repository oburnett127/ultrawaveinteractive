// pages/_document.js
import Document, { Html, Head, Main, NextScript } from "next/document";

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
          {/* Osano Cookie Consent: CSS */}
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.css"
          />

          {/* Osano Cookie Consent: JS */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
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
                    "href": "/privacypolicy"
                  }
                });
              });
              `,
            }}
          />

          {/* Osano script loader (must come AFTER the config above) */}
          <script src="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.js" />
        </Head>
        <body>
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}

