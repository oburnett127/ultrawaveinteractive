import Head from "next/head";

/**
 * Helper: Strip HTML tags and build a short description
 */
function buildDescriptionFromHtml(html, maxLength = 160) {
  if (typeof html !== "string") return "";

  const text = html
    .replace(/<[^>]+>/g, " ") // remove tags
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();

  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Server-side data fetching for a blog post.
 * Provides graceful fallbacks and clear diagnostics for rate limits, network errors, and server issues.
 */
export async function getServerSideProps(context) {
  const slug = context.params?.slug;
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

  let post = null;
  let error = null;
  let seo = null;

  try {
    const res = await fetch(`${backendUrl}/api/blog/${slug}`);

    // Handle rate limiting gracefully
    if (res.status === 429) {
      console.warn("Rate limited when fetching blog post:", slug);
      error =
        "Too many requests. Please wait a moment before reloading the page.";
      return { props: { post: null, error, seo: null } };
    }

    // Handle missing posts
    if (res.status === 404) {
      return { notFound: true }; // show Next.js 404 page
    }

    // Handle other errors
    if (!res.ok) {
      const message = `Failed to fetch post (HTTP ${res.status})`;
      console.error(message);
      error =
        res.status >= 500
          ? "Server error. Please try again later."
          : "Unable to load this post. Please check the URL.";
      return { props: { post: null, error, seo: null } };
    }

    // Parse JSON safely
    try {
      post = await res.json();
    } catch (jsonErr) {
      console.error("Invalid JSON response for blog post:", jsonErr);
      error = "Invalid response from server.";
      return { props: { post: null, error, seo: null } };
    }

    if (post) {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
        "http://localhost:3000";

      const url = `${siteUrl}/blog/${post.slug}`;
      const titleBase = post.title || "Blog Post";
      const title = `${titleBase} | Ultrawave Interactive Web Design`;
      const description = buildDescriptionFromHtml(post.content || "");
      const publishedTime = post.createdAt || null;
      const modifiedTime = post.updatedAt || post.createdAt || null;

      // You can later add a specific OG image per post; for now use a default
      const ogImage = `${siteUrl}/images/og-default.jpg`;

      seo = {
        title,
        description,
        url,
        ogImage,
        publishedTime,
        modifiedTime,
      };
    }
  } catch (err) {
    // Network / fetch-level errors
    console.error("Network error fetching blog post:", err);
    error = "Network error. Please check your connection and try again.";
    return { props: { post: null, error, seo: null } };
  }

  // Return either the post or an error
  return {
    props: { post, error, seo },
  };
}

/**
 * Client-side render of a blog post.
 * Displays loading/fallback/error states gracefully.
 */
export default function BlogPost({ post, error, seo }) {
  // Basic fallback SEO if we hit an error
  const fallbackTitle = "Blog | Ultrawave Interactive Web Design";
  const fallbackDescription =
    "Read web design tips, performance insights, and digital strategy articles from Ultrawave Interactive.";

  // Build JSON-LD if we have a post
  const jsonLd =
    post && seo
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title || "Blog Post",
          description: seo.description || "",
          datePublished: seo.publishedTime || undefined,
          dateModified: seo.modifiedTime || undefined,
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": seo.url,
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
              url: seo.ogImage,
            },
          },
          image: seo.ogImage ? [seo.ogImage] : undefined,
        }
      : null;

  if (error) {
    return (
      <>
        <Head>
          <title>{fallbackTitle}</title>
          <meta name="description" content={fallbackDescription} />
        </Head>
        <div className="blog-post-container">
          <h1 className="blog-title">Error Loading Post</h1>
          <p style={{ color: "#b00", padding: "10px" }}>{error}</p>
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Head>
          <title>{fallbackTitle}</title>
          <meta name="description" content={fallbackDescription} />
        </Head>
        <div className="blog-post-container">
          <h1 className="blog-title">Post Not Found</h1>
          <p>This blog post could not be found or has been removed.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        {/* Basic SEO */}
        <title>{seo?.title || fallbackTitle}</title>
        <meta
          name="description"
          content={seo?.description || fallbackDescription}
        />

        {/* Canonical URL */}
        {seo?.url && <link rel="canonical" href={seo.url} />}

        {/* Open Graph tags */}
        <meta property="og:type" content="article" />
        {seo?.title && <meta property="og:title" content={seo.title} />}
        {seo?.description && (
          <meta property="og:description" content={seo.description} />
        )}
        {seo?.url && <meta property="og:url" content={seo.url} />}
        {seo?.ogImage && <meta property="og:image" content={seo.ogImage} />}
        <meta property="og:site_name" content="Ultrawave Interactive" />
        {seo?.publishedTime && (
          <meta property="article:published_time" content={seo.publishedTime} />
        )}
        {seo?.modifiedTime && (
          <meta property="article:modified_time" content={seo.modifiedTime} />
        )}

        {/* JSON-LD structured data */}
        {jsonLd && (
          <script
            type="application/ld+json"
            // JSON-LD must be a string
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
      </Head>

      <div className="blog-post-container">
        <h1 className="blog-title">{post.title || "Untitled Post"}</h1>

        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </>
  );
}
