import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1>404 — Page Not Found</h1>

      <p>
        The page you are looking for does not exist.
      </p>

      <Link href="/" style={{ marginTop: "1rem" }}>
        Return to Home
      </Link>
    </main>
  );
}