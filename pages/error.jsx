import Head from 'next/head';
import React from 'react';


function Error() {
  return (
    <>
      <Head>
        <title>Ultrawave Interactive Web Design | Error</title>
        <meta name="description" content="We're experiencing technical issues at Ultrawave Interactive Web Design. Please check back soon, and thank you for your patience." />
      </Head>
      <main id="main-content">
        <h1>An error occurred.</h1>
        <p>Please try again.</p>
      </main>
    </>
  );
}

export default Error;
