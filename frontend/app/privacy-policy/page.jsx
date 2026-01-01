// app/privacy-policy/page.jsx
import fs from "fs";
import path from "path";

// ✅ App Router metadata replaces <Head>
export const metadata = {
  title: "Ultrawave Interactive Web Design | Privacy Policy",
  description:
    "Explore our Privacy Policy to understand how Ultrawave Interactive Web Design collects, uses, and protects your personal data to ensure your privacy and trust.",
};

// 🧊 Static generation (default behavior)
export default function PrivacyPolicyPage() {
  const filePath = path.join(
    process.cwd(),
    "public",
    "privacy-policy.txt"
  );

  let privacyPolicyText = "";

  try {
    privacyPolicyText = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error("Error reading privacy policy file:", err.message);
    privacyPolicyText = "Privacy Policy could not be loaded.";
  }

  return (
    <main id="main-content">
      <h1 className="white-text">Privacy Policy</h1>
      <pre className="white-text">{privacyPolicyText}</pre>
    </main>
  );
}
