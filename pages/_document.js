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
          {/* If you keep any inline <style> blocks YOU control, give them the nonce */}
          {/* <style nonce={nonce}>{`.some { display: none; }`}</style> */}
        </Head>
        <body>
          <Main />
          {/* 🔑 This enables hydration under a nonce-based CSP */}
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}

