import Head from "next/head";

export default function PrivacyPolicy({ privacyPolicyText }) {
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
}

// 🧊 SSG — built once at deployment
export async function getStaticProps() {
  const fs = require("fs");
  const path = require("path");

  const filePath = path.join(process.cwd(), "public", "privacy-policy.txt");

  let privacyPolicyText = "";

  try {
    privacyPolicyText = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error("Error reading privacy policy file:", err.message);
    termsOfServiceText = "Privacy Policy could not be loaded.";
  }

  return {
    props: {
      privacyPolicyText,
    },
  };
};