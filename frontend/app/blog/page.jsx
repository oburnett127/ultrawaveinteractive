// app/blog/page.jsx
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

// ---------------------------------------------
// Page component (Server Component)
// ---------------------------------------------
export default async function BlogListPage() {
  let posts = [];
  let error = null;

  if (!backendUrl) {
    console.error("❌ Missing NEXT_PUBLIC_BACKEND_URL");
    error = "Backend not configured. Please try again later.";
  } else {
    try {
      const res = await fetch(`${backendUrl}/api/blog/list`, {
        next: { revalidate: 60 },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (Array.isArray(data.posts)) {
        posts = data.posts;
      } else {
        console.warn("Unexpected blog list format");
      }
    } catch (err) {
      console.error("❌ Blog list fetch failed:", err);
      error = "Unable to load blog posts. Please try again later.";
    }
  }

  return (
    <main id="main-content" className="blog-list-container">
      <h1>Blog</h1>

      {error && <p className="error-message">⚠️ {error}</p>}

      {!error && posts.length === 0 && (
        <p className="no-posts-message">
          No blog posts found. Please check back soon.
        </p>
      )}

      {!error && posts.length > 0 && (
        <ul className="blog-list">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/blog/${post.slug}`}>
                {post.title || "Untitled Post"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
