"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "@/components/Protected.jsx";
import "./createPost.css";

export default function CreatePostClient() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!title.trim() || !content.trim()) {
      setError("Title and content cannot be empty.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/blog/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, content }),
      });

      if (res.status === 429) {
        setError("You're posting too fast. Please wait before retrying.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        let message = `Request failed (${res.status})`;

        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {}

        if (res.status >= 500) {
          message = "Server error — please try again later.";
        }

        setError(message);
        setLoading(false);
        return;
      }

      let data;
      try {
        data = await res.json();
      } catch {
        setError("Invalid server response.");
        setLoading(false);
        return;
      }

      if (data?.slug) {
        router.push(`/blog/${data.slug}`);
      } else {
        setError("Unexpected server response.");
      }
    } catch (err) {
      console.error("Create post error:", err);
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Protected otpRequired>
      <main id="main-content" className="create-post-container">
        <form onSubmit={handleSubmit} noValidate>
          <h1>Create Blog Post</h1>

          {error && <p className="error-text">{error}</p>}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            required
            disabled={loading}
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            placeholder="Write your blog content here in Markdown format..."
            required
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Publishing..." : "Publish"}
          </button>
        </form>
      </main>
    </Protected>
  );
}
