import Head from "next/head";
import React, { useState, useEffect } from "react";


const PrivacyPolicy = () => {
  const [policyText, setPolicyText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/privacy-policy.txt")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch the privacy policy.");
        }
        return response.text();
      })
      .then((text) => {
        setPolicyText(text);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading privacy policy:", error);
        setPolicyText("Sorry, we couldn't load the privacy policy at this time.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading privacy policy...</p>;
  }

  return (
    <div>
      <Head>
        <title>Ultrawave Interactive Web Design | Privacy Policy</title>
        <meta
          name="description"
          content="Explore our Privacy Policy to understand how Ultrawave Interactive Web Design collects, uses, and protects your personal data to ensure your privacy and trust."
        />
      </Head>
      <main id="main-content">
        <h1 className="white-text">Privacy Policy</h1>
        <pre className="white-text">{policyText}</pre>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
