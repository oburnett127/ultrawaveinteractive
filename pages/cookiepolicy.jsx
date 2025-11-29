import Head from "next/head";
import React, { useState, useEffect } from "react";
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';

const CookiePolicy = () => {
  const [cookiePolicyText, setCookiePolicyText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/cookie-policy.txt")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch the cookie policy.");
        }
        return response.text();
      })
      .then((text) => {
        setCookiePolicyText(text);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading cookie policy:", error);
        setTermsOfServiceText("Sorry, we couldn't load the cookie policy at this time.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading cookie policy...</p>;
  }

  return (
    <div>
      <Head>
        <title>Ultrawave Interactive Web Design | Cookie Policy</title>
        <meta name="description" content="Read the Cookie Policy for Ultrawave Interactive Web Design to learn about how we use cookies on our website." />
      </Head>

      <main id="main-content">
        <h1 className="white-text">Cookie Policy</h1>
        <div className="markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{cookiePolicyText}</ReactMarkdown>
        </div>
      </main>
    </div>
  );
};

export default CookiePolicy;