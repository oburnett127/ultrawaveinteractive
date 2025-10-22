import ReactMarkdown from 'react-markdown';

export async function getServerSideProps(context) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/blog/${context.params.slug}`);
  const post = await res.json();

  return { props: { post } };
}

export default function BlogPost({ post }) {
  return (
    <div>
      <h1 className="blog-title">{post.title}</h1>
      <ReactMarkdown className="markdown-body">{post.content}</ReactMarkdown>
    </div>
  );
}
//
