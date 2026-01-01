// app/terms-of-service/page.jsx
import fs from "fs";
import path from "path";

// ✅ App Router metadata replaces <Head>
export const metadata = {
  title: "Ultrawave Interactive Web Design | Terms of Service",
  description:
    "Read the Terms of Service for Ultrawave Interactive Web Design to learn about the guidelines, responsibilities, and rights that apply to our website and services.",
};

// 🧊 Static generation (default behavior)
export default function TermsOfServicePage() {
  const filePath = path.join(
    process.cwd(),
    "public",
    "terms-of-service.txt"
  );

  let termsOfServiceText = "";

  try {
    termsOfServiceText = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error("Error reading terms of service file:", err.message);
    termsOfServiceText = "Terms of Service could not be loaded.";
  }

  return (
    <main id="main-content">
      <h1 className="white-text">Terms of Service</h1>
      <pre className="white-text">{termsOfServiceText}</pre>
    </main>
  );
}
