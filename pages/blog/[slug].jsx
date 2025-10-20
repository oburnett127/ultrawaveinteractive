import ReactMarkdown from 'react-markdown';

export async function getServerSideProps(context) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/blog/${context.params.slug}`);
  const post = await res.json();

  return { props: { post } };
}

export default function BlogPost({ post }) {
  const authorName = post?.author?.name || post?.author?.email || "Admin";
  const date = new Date(post.createdAt).toLocaleDateString();

  return (
    <div>
      <h1 className="blog-title">{post.title}</h1>
      <p className="blog-title">
        <i>By {authorName} on {date}</i>
      </p>
      <ReactMarkdown>{post.content}</ReactMarkdown>
    </div>
  );
}
