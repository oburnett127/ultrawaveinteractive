import '../styles/globals.css'; // Import global styles
import type { AppProps } from 'next/app'; // Import AppProps for typing
import Footer from '../components/Footer';
import { SessionProvider } from "next-auth/react";
import Header from '../components/Header';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div>
      <SessionProvider session={pageProps.session}>
        <Header />
        <header>Ultrawave Interactive Web Design</header>
        <Component {...pageProps} />;
      </SessionProvider>
      <Footer />
    </div>
  );
}

export default MyApp;
