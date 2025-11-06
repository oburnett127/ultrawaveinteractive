import '../styles/globals.css';
import Footer from '../components/Footer';
import { SessionProvider } from "next-auth/react";
import Script from 'next/script';
import GlobalBackground from "../components/GlobalBackground";
import Header from "../components/Header"; // ✅ create this
import { CssBaseline } from "@mui/material";
import SalesChatbot from '../components/SalesChatbot';

function MyApp({ Component, pageProps }) {
  return (
    <SessionProvider session={pageProps.session}>
      <CssBaseline />
      <Script
        src={
          process.env.NODE_ENV === 'production'
            ? 'https://web.squarecdn.com/v1/square.js'
            : 'https://sandbox.web.squarecdn.com/v1/square.js'
        }
        strategy="beforeInteractive"
      />
      <Header /> {/* ✅ now it’s safely inside the provider */}
      <GlobalBackground />
      <Component {...pageProps} />
      <SalesChatbot />
      <Footer />
    </SessionProvider>
  );
}

export default MyApp;
