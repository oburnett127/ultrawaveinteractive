import '../styles/globals.css'; // Import global styles
import type { AppProps } from 'next/app'; // Import AppProps for typing

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
