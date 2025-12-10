import Head from "next/head";

export default function TermsOfService({ termsOfServiceText }) {
  return (
    <div>
      <Head>
        <title>Ultrawave Interactive Web Design | Terms of Service</title>
        <meta
          name="description"
          content="Read the Terms of Service for Ultrawave Interactive Web Design to learn about the guidelines, responsibilities, and rights that apply to our website and services."
        />
      </Head>

      <main id="main-content">
        <h1 className="white-text">Terms of Service</h1>
        <pre className="white-text">{termsOfServiceText}</pre>
      </main>
    </div>
  );
}

// 🧊 SSG — built once at deployment
export async function getStaticProps() {
  const fs = require("fs");
  const path = require("path");

  const filePath = path.join(process.cwd(), "public", "terms-of-service.txt");

  let termsOfServiceText = "";

  try {
    termsOfServiceText = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error("Error reading terms of service file:", err.message);
    termsOfServiceText = "Terms of Service could not be loaded.";
  }

  return {
    props: {
      termsOfServiceText,
    },
  };
}
