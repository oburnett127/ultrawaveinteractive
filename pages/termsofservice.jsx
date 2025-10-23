import Head from "next/head";
import React, { useState, useEffect } from "react";


const TermsOfService = () => {
  const [termsOfServiceText, setTermsOfServiceText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/terms-of-service.txt")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch the terms of service.");
        }
        return response.text();
      })
      .then((text) => {
        setTermsOfServiceText(text);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading privacy policy:", error);
        setTermsOfServiceText("Sorry, we couldn't load the terms of service at this time.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading terms of service...</p>;
  }

  return (
    <div>
      <Head>
        <title>Ultrawave Interactive Web Design | Terms of Service</title>
        <meta name="description" content="Read the Terms of Service for Ultrawave Interactive Web Design to learn about the guidelines, responsibilities, and rights that apply to our website and services." />
      </Head>

      <h1 className="whiteText">Terms of Service</h1>
      <pre style={{ whiteSpace: "pre-wrap" }} className="whiteText">{termsOfServiceText}</pre>
    </div>
  );
};

export default TermsOfService;

