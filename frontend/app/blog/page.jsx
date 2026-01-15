// app/blog/page.jsx
import Link from "next/link";
import "./blogList.css";

// ---------------------------------------------
// ISR: revalidate blog list every 60 seconds
// ---------------------------------------------
export const revalidate = 60;

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
// Server-only backend URL (recommended)
// - Prefer BACKEND_URL (server-only) over NEXT_PUBLIC_BACKEND_URL
// ---------------------------------------------
function getBackendUrl() {
  const url =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!url) {
    throw new Error("Backend URL not configured");
  }

  return url.replace(/\/+$/, "");
}

// ---------------------------------------------
// Fetch helper with timeout + ISR caching
// ---------------------------------------------
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
// Page component (Server Component)
// ---------------------------------------------
export default async function BlogListPage() {
  const backendUrl = getBackendUrl();

  let posts = [];
  let error = null;

  if (!backendUrl) {
    console.error("❌ Missing BACKEND_URL (or NEXT_PUBLIC_BACKEND_URL fallback).");
    error = "Blog is temporarily unavailable (server not configured). Please try again later.";
  } else {
    const { ok, status, data, error: fetchErr } = await fetchJson(
      `${backendUrl}/api/blog/list`,
      { revalidateSeconds: 60, timeoutMs: 6000 }
    );

    if (!ok) {
      console.error("❌ Blog list fetch failed:", fetchErr || `HTTP ${status}`);
      // Friendly message for users; keep details out of UI
      error = "Unable to load blog posts right now. Please try again later.";
    } else if (Array.isArray(data?.posts)) {
      posts = data.posts;
    } else {
      console.warn("⚠️ Unexpected blog list format:", data);
      // Don’t hard-fail; show “no posts”
      posts = [];
    }
  }

  return (
    <main id="main-content" className="blog-list-container">
      <h1>Blog</h1>

      {error && <p className="error-message">⚠️ {error}</p>}

      {!error && posts.length === 0 && (
        <p className="no-posts-message">No blog posts found. Please check back soon.</p>
      )}

      {!error && posts.length > 0 && (
        <ul className="blog-list">
          {posts.map((post) => (
            <li key={post.id || post.slug}>
              <Link href={`/blog/${post.slug}`}>{post.title || "Untitled Post"}</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
