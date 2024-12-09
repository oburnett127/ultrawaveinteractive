import '../styles/globals.css'; // Import global styles
import type { AppProps } from 'next/app'; // Import AppProps for typing
import Footer from '../components/Footer';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div>
      <header>Ultrawave Interactive Web Design</header>
      <Component {...pageProps} />;
      <Footer />
    </div>
  );
}

export default MyApp;
