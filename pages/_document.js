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
      <Html>
        <Head>
          {/* PROBE: will set a global if inline scripts run under your CSP */}
          <script nonce={nonce} dangerouslySetInnerHTML={{
            __html: `window.__CSP_PROBE__="ran";`
          }} />
          {/* Load Square SDK regardless of hydration (see Step 2) */}
          <script nonce={nonce} src="https://web.squarecdn.com/v1/square.js" defer />
        </Head>
        <body>
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}
