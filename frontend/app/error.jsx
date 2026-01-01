"use client";

import { useEffect } from "react";
import "@/styles/error.css";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("[App Router Error Boundary]", error);
  }, [error]);

  return (
    <main id="main-content" className="error-container">
      <h1>Something went wrong</h1>

      <p>An unexpected error occurred. Please try again.</p>

      <button
        type="button"
        onClick={() => reset()}
        className="error-retry-button"
      >
        Retry
      </button>
    </main>
  );
}
