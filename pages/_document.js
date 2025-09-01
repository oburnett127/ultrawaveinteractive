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
          <link
            rel="preload"
            as="image"
            href="/images/hero-1280.avif"
            type="image/avif"
            imagesrcset="/images/hero-640.avif 640w, /images/hero-1280.avif 1280w, /images/hero-1920.avif 1920w"
            imagesizes="100vw"
          />
          <link
            rel="preload"
            as="image"
            href="/images/hero-1280.webp"
            type="image/webp"
            imagesrcset="/images/hero-640.webp 640w, /images/hero-1280.webp 1280w, /images/hero-1920.webp 1920w"
            imagesizes="100vw"
          />
          <link
            rel="preload"
            as="image"
            href="/images/hero-1280.jpg"
            type="image/jpeg"
            imagesrcset="/images/hero-640.jpg 640w, /images/hero-1280.jpg 1280w, /images/hero-1920.jpg 1920w"
            imagesizes="100vw"
          />
        </Head>
        <body>
          <Main />
          <NextScript nonce={nonce} /> {/* keep this */}
        </body>
      </Html>
    );
  }
}
