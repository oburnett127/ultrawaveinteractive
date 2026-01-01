import Link from "next/link";
import "./blogList.css";

// ---------------------------------------------
// ISR: revalidate blog list every 60 seconds
// ---------------------------------------------
export const revalidate = 60;

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

// ---------------------------------------------
// SEO metadata (replaces <Head />)
// ---------------------------------------------
export function generateMetadata() {
  return {
    title: "Blog — Ultrawave Interactive",
    description:
      "Articles on web design, SEO, performance optimization, and growing your online presence.",
  };
}