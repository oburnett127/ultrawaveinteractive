import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function CreatePost() {
  const { data: session } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch('/api/blog/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });

    if (res.ok) {
      const post = await res.json();
      router.push(`/blog/${post.slug}`);
    } else {
      const { error } = await res.json();
      setError(error || 'Unknown error');
    }
  };

  if (!session) return <p>You must be logged in</p>;

  return (
    <form onSubmit={handleSubmit}>
      <h1>Create Blog Post</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" required />
      <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Markdown content" rows={15} required />
      <button type="submit">Publish</button>
    </form>
  );
}
