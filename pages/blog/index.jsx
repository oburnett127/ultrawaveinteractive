import Link from 'next/link';

export async function getServerSideProps() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";
  
  const res = await fetch(`${backendUrl}/api/blog/list`);
  const data = await res.json();

  console.log("✅ API Response to frontend:", data);

  return { props: { posts: Array.isArray(data) ? data : [] } };
}



export default function BlogList({ posts }) {
  return (
    <div>
      <h1>Blog</h1>
      <ul>
        {posts.map(post => (
          <li key={post.id}>
            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
