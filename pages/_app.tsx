import '../styles/globals.css'; // Import global styles
import type { AppProps } from 'next/app'; // Import AppProps for typing
import Footer from '../components/Footer';
import { SessionProvider } from "next-auth/react";
import { CsrfProvider } from '../components/CsrfContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div>
      <SessionProvider session={pageProps.session}>
        <CsrfProvider>
          <header><h1><a href="/">Ultrawave Interactive Web Design</a></h1></header>
          <Component {...pageProps} />
        </CsrfProvider>
      </SessionProvider>
      <Footer />
    </div>
  );
}

export default MyApp;
