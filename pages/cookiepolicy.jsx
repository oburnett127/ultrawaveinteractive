import Head from 'next/head';
import { useEffect } from 'react';

function CookiePolicy() {
  useEffect(() => {
    const existingScript = document.getElementById('CookieDeclarationScript');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'CookieDeclarationScript';
      script.src = 'https://consent.cookiebot.com/1123ad0d-92b4-4708-9484-2156b78a0795/cd.js';
      script.type = 'text/javascript';
      script.async = true;
      script.setAttribute('data-cbid', '1123ad0d-92b4-4708-9484-2156b78a0795');
      script.setAttribute('data-blockingmode', 'auto');
      script.setAttribute('data-culture', 'EN');

      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  return (
    <div>
      <Head>
        <title>Ultrawave Interactive Web Design | Cookie Policy</title>
        <meta name="description" content="Read our Cookie Policy to understand how Ultrawave Interactive uses cookies to enhance your browsing experience and provide personalized services." />
      </Head>

      <h1>Cookie Policy</h1>
      <div id="CookieDeclaration"></div>
    </div>
  );
}

export default CookiePolicy;
