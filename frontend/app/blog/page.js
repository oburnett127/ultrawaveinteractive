import Head from "next/head";
import Link from "next/link";

export default function BlogList({ posts, error }) {
  return (
    <>
      <Head>
        <title>Blog — Ultrawave Interactive</title>
        <meta
          name="description"
          content="Articles on web design, SEO, performance optimization, and growing your online presence."
        />
      </Head>

      <main id="main-content" className="blog-list-container">
        <h1>Blog</h1>

        {error && <p className="error-message">⚠️ {error}</p>}

        {!error && posts.length === 0 && (
          <p className="no-posts-message">No blog posts found. Please check back soon.</p>
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
      </main>
    </>
  );
}

// 🧊 ISR — Static generation with background revalidation
export async function getStaticProps() {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

  let posts = [];
  let error = null;

  if (!backendUrl) {
    console.error("❌ Missing NEXT_PUBLIC_BACKEND_URL in env variables.");
    return {
      props: {
        posts,
        error: "Backend not configured. Please try again later.",
      },
      revalidate: 60,
    };
  }

  try {
    const res = await fetch(`${backendUrl}/api/blog/list`);
    if (!res.ok) throw new Error(`Backend error: HTTP ${res.status}`);

    const data = await res.json();

    if (Array.isArray(data.posts)) {
      posts = data.posts;
    } else {
      console.warn("Unexpected format — falling back to empty list.");
    }
  } catch (err) {
    console.error("❌ Blog fetch failed:", err);
    error = "Unable to load blog posts. Please try again later.";
  }

  return {
    props: { posts, error },
    revalidate: 60, // regenerate page every 60s when traffic hits
  };
}
