export async function POST(req) {
  const data = await req.json();

  const response = await fetch(
    process.env.NEXT_PUBLIC_BACKEND_URL + "/contact",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  const result = await response.json();
  return Response.json(result, { status: response.status });
}
