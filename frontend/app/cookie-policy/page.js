// app/cookie-policy/page.jsx
import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./cookiePolicy.css";

// ---------------------------------------------
// SEO metadata (replaces next/head)
// ---------------------------------------------
export function generateMetadata() {
  return {
    title: "Ultrawave Interactive Web Design | Cookie Policy",
    description:
      "Read the Cookie Policy for Ultrawave Interactive Web Design to learn about how we use cookies on our website.",
  };
}

// ---------------------------------------------
// Page component (SSG at build time)
// ---------------------------------------------
export default function CookiePolicyPage() {
  const filePath = path.join(process.cwd(), "public", "cookie-policy.txt");

  let cookiePolicyText = "";

  try {
    cookiePolicyText = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error("Error reading cookie policy file:", err.message);
    cookiePolicyText = "Cookie Policy could not be loaded.";
  }

  return (
    <main id="main-content" className="cookie-policy-container">
      <h1 className="white-text">Cookie Policy</h1>

      <div className="markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {cookiePolicyText}
        </ReactMarkdown>
      </div>
    </main>
  );
}
