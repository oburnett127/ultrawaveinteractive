import React from 'react';
import { Helmet } from 'react-helmet';

function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Ultrawave Interactive Web Design | Not Found</title>
        <meta name="description" content="The page you're looking for can't be found. Contact us for assistance if needed at Ultrawave Interactive Web Design." />
      </Helmet>

        <h1>Not Found - 404</h1>
        <p>The page you are looking for was not found.</p>
    </>
);
}

export default NotFoundPage;
