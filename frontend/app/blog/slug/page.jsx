// app/blog/[slug]/page.jsx
import { notFound } from "next/navigation";
import "./blogPost.css";

// ---------------------------------------------
// ISR: regenerate page every 60 seconds
// ---------------------------------------------
export const revalidate = 60;

// If generateStaticParams returns [] due to outage,
// still allow on-demand generation for new/existing slugs.
export const dynamicParams = true;

/**
 * Helper: Strip HTML tags and build a short description
 */
function buildDescriptionFromHtml(html, maxLength = 160) {
  if (typeof html !== "string") return "";

  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;

  return text.slice(0, maxLength).trimEnd() + "…";
}

function getBackendUrl() {
  const raw =
    process.env.INTERNAL_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL || // fallback if you haven’t added BACKEND_URL yet
    "";

  return raw.replace(/\/+$/, "");
}

function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000";

  return raw.replace(/\/+$/, "");
}

async function fetchJson(url, { revalidateSeconds = 60, timeoutMs = 6000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      next: { revalidate: revalidateSeconds },
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, status: res.status, data: null };
    }

    const data = await res.json();
    return { ok: true, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err };
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------
// Static paths (replaces getStaticPaths)
// ---------------------------------------------
export async function generateStaticParams() {
  const backendUrl =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendUrl) {
    console.warn("⚠️ No backend URL — skipping static params");
    return [];
  }

  try {
    const res = await fetch(`${backendUrl}/api/blog/list`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.warn("⚠️ Blog list unavailable — ISR will handle later");
      return [];
    }

    const data = await res.json();
    return Array.isArray(data.posts)
      ? data.posts.map((p) => ({ slug: p.slug }))
      : [];
  } catch (err) {
    console.warn("⚠️ generateStaticParams failed — build continues");
    return [];
  }
}

// ---------------------------------------------
// SEO metadata (replaces <Head />)
// ---------------------------------------------
export async function generateMetadata({ params }) {
  const backendUrl = getBackendUrl();
  const siteUrl = getSiteUrl();

  // Safe defaults (used on outage)
  const fallback = {
    title: "Blog | Ultrawave Interactive",
    description:
      "Read web design tips, performance insights, and digital strategy articles from Ultrawave Interactive.",
    alternates: {
      canonical: `${siteUrl}/blog/${params.slug}`,
    },
    openGraph: {
      type: "article",
      title: "Blog | Ultrawave Interactive",
      description:
        "Read web design tips, performance insights, and digital strategy articles from Ultrawave Interactive.",
      url: `${siteUrl}/blog/${params.slug}`,
      siteName: "Ultrawave Interactive",
      images: [`${siteUrl}/images/og-default.jpg`],
    },
  };

  if (!backendUrl) return fallback;

  const { ok, status, data: post } = await fetchJson(
    `${backendUrl}/api/blog/${params.slug}`,
    { revalidateSeconds: 60, timeoutMs: 6000 }
  );

  if (!ok) {
    // If it’s truly missing, we can leave metadata fallback; page will notFound() later
    if (status === 404) return fallback;
    return fallback;
  }

  const url = `${siteUrl}/blog/${post.slug}`;
  const title = `${post.title || "Blog Post"} | Ultrawave Interactive`;
  const description = buildDescriptionFromHtml(post.content || "");
  const ogImage = `${siteUrl}/images/og-default.jpg`;

  return {
    title,
    description,
    alternates: { canonical: url },
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
}

// ---------------------------------------------
// Page component
// ---------------------------------------------
export default async function BlogPostPage({ params }) {
  const backendUrl = getBackendUrl();
  const siteUrl = getSiteUrl();

  if (!backendUrl) {
    return (
      <main id="main-content">
        <div className="blog-post-container">
          <h1 className="blog-title">Blog Unavailable</h1>
          <p className="blog-error">
            The blog service is temporarily unavailable. Please try again later.
          </p>
        </div>
      </main>
    );
  }

  const { ok, status, data: post, error } = await fetchJson(
    `${backendUrl}/api/blog/${params.slug}`,
    { revalidateSeconds: 60, timeoutMs: 6000 }
  );

  if (!ok) {
    if (status === 404) notFound();

    console.error("Blog post fetch error:", error || `HTTP ${status}`);

    return (
      <main id="main-content">
        <div className="blog-post-container">
          <h1 className="blog-title">Error Loading Post</h1>
          <p className="blog-error">Unable to load this post. Please try again later.</p>
        </div>
      </main>
    );
  }

  if (!post) notFound();

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main id="main-content">
        <div className="blog-post-container">
          <h1 className="blog-title">{post.title || "Untitled Post"}</h1>

          <div
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: post.content || "" }}
          />
        </div>
      </main>
    </>
  );
}