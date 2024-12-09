import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";

const PrivacyPolicyPage = () => {
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
      <Helmet>
        <title>Ultrawave Interactive Web Design | Privacy Policy</title>
        <meta name="description" content="Explore our Privacy Policy to understand how Ultrawave Interactive Web Design collects, uses, and protects your personal data to ensure your privacy and trust." />
      </Helmet>

      <h1>Privacy Policy</h1>
      <pre style={{ whiteSpace: "pre-wrap" }}>{policyText}</pre>
    </div>
  );
};

export default PrivacyPolicyPage;
