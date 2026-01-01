import Link from "next/link";
import "@/styles/not-found.css";

export default function NotFound() {
  return (
    <section className="notfound-container">
      <h1>404 — Page Not Found</h1>

      <p>The page you are looking for does not exist.</p>

      <Link href="/" className="notfound-link">
        Return to Home
      </Link>
    </section>
  );
}
