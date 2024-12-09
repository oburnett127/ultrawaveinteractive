import React from 'react';
import { Helmet } from 'react-helmet';

function ErrorPage() {
  return (
    <>
      <Helmet>
        <title>Ultrawave Interactive Web Design | Error</title>
        <meta name="description" content="We're experiencing technical issues at Ultrawave Interactive Web Design. Please check back soon, and thank you for your patience." />
      </Helmet>

        <h1>An error occurred.</h1>
        <p>Please try again.</p>
    </>
  );
}

export default ErrorPage;
