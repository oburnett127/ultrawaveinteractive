import Document, { Html, Head, Main, NextScript } from "next/document";

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    const nonce = ctx?.res?.locals?.cspNonce || ""; // from Express
    return { ...initialProps, nonce };
  }

  render() {
    const { nonce } = this.props;
    return (
      <Html>
        <Head>
          {/* Example of a small inline style you control */}
          <style nonce={nonce}>{`:root { --brand-color: #0EA5E9; }`}</style>

          {/* If you use <Script> for reCAPTCHA or Square loader inline snippets: */}
        </Head>
        <body>
          <Main />
          {/* NextScript accepts a nonce prop; this tags all Next inline runtime scripts */}
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}
