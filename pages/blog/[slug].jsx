import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export async function getServerSideProps(context) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/blog/${context.params.slug}`);
  if (res.status === 429) {
    console.warn("Rate limited. Backing off.");
    return; // don't retry immediately
  }
  
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
  const post = await res.json();

  return { props: { post } };
}

export default function BlogPost({ post }) {
  return (
    <div className="blog-post-container">
      <h1 className="blog-title">{post.title}</h1>
      <div className="left-aligned-text">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
