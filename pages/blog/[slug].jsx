import ReactMarkdown from 'react-markdown';

export async function getServerSideProps(context) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/blog/${context.params.slug}`);
  const post = await res.json();

  console.log("POST FROM API:", post); // ✅ add this

  return { props: { post } };
}

export default function BlogPost({ post }) {
  return (
    <div>
      <pre>{JSON.stringify(post, null, 2)}</pre>
        <div>
          <h1 className="blog-title">{post.title}</h1>
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
    </div>
  );
}
