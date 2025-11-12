import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function CreatePost() {
  const { data: session } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic client-side validation
    if (!title.trim() || !content.trim()) {
      setError("Title and content cannot be empty.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/api/blog/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      // Handle rate-limiting
      if (res.status === 429) {
        setError("You're posting too fast. Please wait a minute before retrying.");
        console.warn("Rate limited. Backing off.");
        setLoading(false);
        return;
      }

      // Handle network-level failures (non-HTTP)
      if (!res.ok) {
        let errorMessage = `Request failed with status ${res.status}`;

        try {
          const data = await res.json();
          if (data?.error) errorMessage = data.error;
        } catch {
          // Non-JSON response (e.g., HTML error page)
        }

        if (res.status >= 500) {
          errorMessage =
            "Server error — please try again later or contact support if this persists.";
        } else if (res.status >= 400) {
          errorMessage = errorMessage || "Invalid request — please check your input.";
        }

        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Parse response safely
      let postData;
      try {
        postData = await res.json();
      } catch {
        setError("Invalid server response. Please try again later.");
        setLoading(false);
        return;
      }

      if (postData?.slug) {
        router.push(`/blog/${postData.slug}`);
      } else {
        setError("Unexpected response from server.");
      }
    } catch (err) {
      console.error("Network or unexpected error:", err);
      setError(
        "Unable to reach the server. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!session)
    return <p>You must be logged in to create a blog post.</p>;

  return (
    <form onSubmit={handleSubmit}>
      <h1>Create Blog Post</h1>

      {error && (
        <p className="red-text">
          {error}
        </p>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        required
        disabled={loading}
      />

      <textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={20}
        className="width-100-percent"
        placeholder="Write your blog content here in Markdown format..."
        required
        disabled={loading}
      ></textarea>

      <button type="submit" disabled={loading}>
        {loading ? "Publishing..." : "Publish"}
      </button>
    </form>
  );
}
