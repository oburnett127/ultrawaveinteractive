import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

  try {
    const res = await fetch(`${backendUrl}/api/blog/${slug}`);

    // Handle rate limiting gracefully
    if (res.status === 429) {
      console.warn("Rate limited when fetching blog post:", slug);
      error =
        "Too many requests. Please wait a moment before reloading the page.";
      return { props: { post: null, error } };
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
      return { props: { post: null, error } };
    }

    // Parse JSON safely
    try {
      post = await res.json();
    } catch (jsonErr) {
      console.error("Invalid JSON response for blog post:", jsonErr);
      error = "Invalid response from server.";
    }
  } catch (err) {
    // Network / fetch-level errors
    console.error("Network error fetching blog post:", err);
    error = "Network error. Please check your connection and try again.";
  }

  // Return either the post or an error
  return {
    props: { post, error },
  };
}

/**
 * Client-side render of a blog post.
 * Displays loading/fallback/error states gracefully.
 */
export default function BlogPost({ post, error }) {
  // Defensive checks
  if (error) {
    return (
      <div className="blog-post-container">
        <h1 className="blog-title">Error Loading Post</h1>
        <p style={{ color: "#b00", background: "blue", padding: "10px" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="blog-post-container">
        <h1 className="blog-title">Post Not Found</h1>
        <p>This blog post could not be found or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="blog-post-container">
      <h1 className="blog-title">{post.title || "Untitled Post"}</h1>
      <div className="left-aligned-text">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content || "*This post has no content.*"}
        </ReactMarkdown>
      </div>
    </div>
  );
}
