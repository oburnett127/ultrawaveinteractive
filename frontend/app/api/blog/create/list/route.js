export async function GET() {
  try {
    const res = await fetch(
      `${process.env.BACKEND_INTERNAL_URL}/api/blog/list`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        cache: "no-store"
      }
    );

    if (!res.ok) {
      return new Response(
        JSON.stringify({ posts: [] }),
        { status: res.status }
      );
    }

    const data = await res.json();

    return Response.json({
      posts: Array.isArray(data.posts) ? data.posts : []
    });
  } catch (err) {
    console.error("Proxy error:", err);

    return Response.json(
      { posts: [] },
      { status: 500 }
    );
  }
}
