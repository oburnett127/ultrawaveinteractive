import '../styles/globals.css';
import Footer from '../components/Footer';
import { SessionProvider } from "next-auth/react";
import Link from 'next/link';
import Script from 'next/script'; // ✅ Add this line
import GlobalBackground from "../components/GlobalBackground";

function MyApp({ Component, pageProps }) {
  return (
    <div>
      <SessionProvider session={pageProps.session}>
        {/* ✅ Load the Square Payment SDK script */}
        <Script
          src={
            process.env.NODE_ENV === 'production'
              ? 'https://web.squarecdn.com/v1/square.js'
              : 'https://sandbox.web.squarecdn.com/v1/square.js'
          }
          strategy="beforeInteractive"
        />

        <header>
          <h1><Link href="/">Ultrawave Interactive Web Design</Link></h1>
        </header>

        <GlobalBackground />
        <Component {...pageProps} />
      </SessionProvider>
      <Footer />
    </div>
  );
}

export default MyApp;
