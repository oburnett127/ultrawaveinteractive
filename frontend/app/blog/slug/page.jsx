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

// ---------------------------------------------
// Page component
// ---------------------------------------------
export default async function BlogPostPage({ params }) {
  let post;

  try {
    const res = await fetch(`${backendUrl}/api/blog/${params.slug}`, {
      next: { revalidate: 60 },
    });

    if (res.status === 404) {
      notFound();
    }

    if (!res.ok) {
      throw new Error("Failed to load blog post");
    }

    post = await res.json();
  } catch (err) {
    console.error("Blog post fetch error:", err);

    return (
      <main id="main-content">
        <div className="blog-post-container">
          <h1 className="blog-title">Error Loading Post</h1>
          <p className="blog-error">
            Unable to load this post. Please try again later.
          </p>
        </div>
      </main>
    );
  }

  if (!post) {
    notFound();
  }

  // ---------------------------------------------
  // JSON-LD structured data
  // ---------------------------------------------
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title || "Blog Post",
    description: buildDescriptionFromHtml(post.content || ""),
    datePublished: post.createdAt || undefined,
    dateModified: post.updatedAt || post.createdAt || undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/blog/${post.slug}`,
    },
    author: {
      "@type": "Organization",
      name: "Ultrawave Interactive",
    },
    publisher: {
      "@type": "Organization",
      name: "Ultrawave Interactive",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/images/og-default.jpg`,
      },
    },
    image: [`${siteUrl}/images/og-default.jpg`],
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main id="main-content">
        <div className="blog-post-container">
          <h1 className="blog-title">{post.title || "Untitled Post"}</h1>

          <div
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </main>
    </>
  );
}
