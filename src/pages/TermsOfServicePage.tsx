import React, { useState, useEffect } from "react";

const TermsOfServicePage = () => {
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
      <h1>Privacy Policy</h1>
      <pre style={{ whiteSpace: "pre-wrap" }}>{termsOfServiceText}</pre>
    </div>
  );
};

export default TermsOfServicePage;

