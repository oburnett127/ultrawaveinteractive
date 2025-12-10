import Head from "next/head";
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';

export default function CookiePolicy({ cookiePolicyText }) {
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

// 🧊 SSG — built once at deployment
export async function getStaticProps() {
  const fs = require("fs");
  const path = require("path");

  const filePath = path.join(process.cwd(), "public", "cookie-policy.txt");

  let termsOfServiceText = "";

  try {
    termsOfServiceText = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error("Error reading terms of service file:", err.message);
    termsOfServiceText = "Cookie Policy could not be loaded.";
  }

  return {
    props: {
      termsOfServiceText,
    },
  };
}