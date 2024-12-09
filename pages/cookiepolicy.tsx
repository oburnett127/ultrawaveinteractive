import Head from 'next/head';
import React, { useEffect } from 'react';


function CookiePolicyPage() {
  useEffect(() => {
    // Check if the script is already added to avoid duplication
    const existingScript = document.getElementById('CookieDeclaration');
    if (!existingScript) {
      // Dynamically create the script element
      const script = document.createElement('script');
      script.id = 'CookieDeclaration';
      script.src = 'https://consent.cookiebot.com/1123ad0d-92b4-4708-9484-2156b78a0795/cd.js';
      script.type = 'text/javascript';
      script.async = true;

      // Append the script to the document
      document.body.appendChild(script);

      // Cleanup the script on unmount to prevent multiple scripts from being added
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []); // Empty dependency array ensures this only runs once on mount

  return (
    <div>
      <Head>
        <title>Ultrawave Interactive Web Design | Cookie Policy</title>
        <meta name="description" content="Read our Cookie Policy to understand how Ultrawave Interactive uses cookies to enhance your browsing experience and provide personalized services." />
      </Head>
      
      <h1>Cookie Policy</h1>
      {/* The Cookiebot script will dynamically render content into the page */}
    </div>
  );
}

export default CookiePolicyPage;

