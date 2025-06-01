import '../styles/globals.css'; // Import global styles
import Footer from '../components/Footer';
import { SessionProvider } from "next-auth/react";

function MyApp({ Component, pageProps }) {
  return (
    <div>
      <SessionProvider session={pageProps.session}>
          <header>
            <h1><a href="/">Ultrawave Interactive Web Design</a></h1>
            <h2>A new web development business opening soon</h2>
          </header>
          <Component {...pageProps} />
      </SessionProvider>
      <Footer />
    </div>
  );
}

export default MyApp;
