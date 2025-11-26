import Link from "next/link";

export async function getServerSideProps() {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

  // Default response
  let posts = [];
  let error = null;

  // Warn if no backend URL configured
  if (!backendUrl) {
    console.error("❌ Missing NEXT_PUBLIC_BACKEND_URL in environment variables.");
    return {
      props: {
        posts,
        error: "Backend not configured. Please contact support or try again later.",
      },
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000); // 7s timeout safeguard

    const res = await fetch(`/api/blog/list`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Backend responded with HTTP ${res.status}`);
    }

    // Safely parse JSON
    const data = await res.json().catch(() => {
      throw new Error("Invalid JSON received from backend.");
    });

    if (!Array.isArray(data)) {
      throw new Error("Unexpected data format — expected an array.");
    }

    posts = data;
    //console.log("✅ Blog list fetched successfully:", data.length, "posts");
  } catch (err) {
    if (err.name === "AbortError") {
      error = "Request timed out. Please try again in a few seconds.";
      console.warn("⚠️ Blog list fetch timed out.");
    } else {
      error = err.message || "An unknown error occurred.";
      console.error("❌ Error fetching blog list:", err);
    }
  }

  return { props: { posts, error } };
}

export default function BlogList({ posts, error }) {
  return (
    <div className="blog-list-container">
      <h1>Blog</h1>

      {error && (
        <p className="error-message">
          ⚠️ {error}
        </p>
      )}

      {!error && posts.length === 0 && (
        <p className="no-posts-message">
          No blog posts found. Please check back soon.
        </p>
      )}

      {!error && posts.length > 0 && (
        <ul className="blog-list">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/blog/${post.slug}`}>{post.title || "Untitled Post"}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
