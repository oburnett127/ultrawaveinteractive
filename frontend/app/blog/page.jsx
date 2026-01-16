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

function getBackendUrl() {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    null
  );
}

export default async function BlogListPage() {
  const backendUrl = getBackendUrl();
  let posts = [];
  let error = null;

  if (!backendUrl) {
    console.warn("⚠️ Backend URL missing — rendering empty blog list");
  } else {
    try {
      const res = await fetch(`${backendUrl}/api/blog/list`, {
        next: { revalidate: 60 },
      });

      if (res.ok) {
        const data = await res.json();
        posts = Array.isArray(data.posts) ? data.posts : [];
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.error("❌ Blog list fetch failed (build-safe):", err);
      // DO NOT throw — allow ISR to recover later
    }
  }

  return (
    <main>
      <h1>Blog</h1>

      {posts.length === 0 && (
        <p>Blog posts will appear shortly.</p>
      )}

      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}