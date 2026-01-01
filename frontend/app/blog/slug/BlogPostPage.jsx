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