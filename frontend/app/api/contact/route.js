export const runtime = "nodejs";

export async function POST(req) {
  console.error("🔥 FRONTEND /api/contact route HIT");

  console.error(
    "🔍 BACKEND_INTERNAL_URL =",
    process.env.BACKEND_INTERNAL_URL
  );

  const data = await req.json();

  const response = await fetch(
    process.env.BACKEND_INTERNAL_URL + "/api/contact",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  console.error("🔁 Backend response status:", response.status);

  const text = await response.text();
  console.error("🔁 Backend raw response:", text);

  return new Response(text, { status: response.status });
}
