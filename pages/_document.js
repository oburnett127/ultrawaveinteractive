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
        <Head />
        <body>
          <Main />
          <NextScript nonce={nonce} /> {/* keep this */}
        </body>
      </Html>
    );
  }
}
