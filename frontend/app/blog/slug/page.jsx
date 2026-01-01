// app/blog/[slug]/page.jsx
import { notFound } from "next/navigation";
import "./blogPost.css";

/**
 * Helper: Strip HTML tags and build a short description
 */
function buildDescriptionFromHtml(html, maxLength = 160) {
  if (typeof html !== "string") return "";

  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "http://localhost:3000";

// ---------------------------------------------
// ISR: regenerate page every 60 seconds
// ---------------------------------------------
export const revalidate = 60;

// ---------------------------------------------
// Static paths (replaces getStaticPaths)
// ---------------------------------------------
export async function generateStaticParams() {
  try {
    const res = await fetch(`${backendUrl}/api/blog/list`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const posts = Array.isArray(data.posts) ? data.posts : [];

    return posts.map((post) => ({
      slug: post.slug,
    }));
  } catch (err) {
    console.error("generateStaticParams error:", err);
    return [];
  }
}

// ---------------------------------------------
// SEO metadata (replaces <Head />)
// ---------------------------------------------
export async function generateMetadata({ params }) {
  try {
    const res = await fetch(`${backendUrl}/api/blog/${params.slug}`, {
      next: { revalidate: 60 },
    });

    if (res.status === 404) return {};

    if (!res.ok) {
      return {
        title: "Blog | Ultrawave Interactive Web Design",
        description:
          "Read web design tips, performance insights, and digital strategy articles from Ultrawave Interactive.",
      };
    }

    const post = await res.json();

    if (!post) return {};

    const url = `${siteUrl}/blog/${post.slug}`;
    const title = `${post.title} | Ultrawave Interactive Web Design`;
    const description = buildDescriptionFromHtml(post.content || "");
    const ogImage = `${siteUrl}/images/og-default.jpg`;

    return {
      title,
      description,
      alternates: {
        canonical: url,
      },
      openGraph: {
        type: "article",
        title,
        description,
        url,
        siteName: "Ultrawave Interactive",
        images: [ogImage],
        publishedTime: post.createdAt || undefined,
        modifiedTime: post.updatedAt || post.createdAt || undefined,
      },
    };
  } catch (err) {
    console.error("generateMetadata error:", err);
    return {};
  }
}