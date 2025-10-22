import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export async function getServerSideProps(context) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/blog/${context.params.slug}`);
  const post = await res.json();

  return { props: { post } };
}

export default function BlogPost({ post }) {
  return (
    <div className="blog-post-container">
      <h1 className="blog-title">{post.title}</h1>
      <ReactMarkdown remarkPlugins={[remarkGfm]} className="markdown-body">
        {post.content}
      </ReactMarkdown>
    </div>
  );
}
