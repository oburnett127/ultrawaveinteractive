"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log to server in production if desired
    console.error("[App Router Error Boundary]", error);
  }, [error]);

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
      <h1>Something went wrong</h1>

      <p>
        An unexpected error occurred. Please try again.
      </p>

      <button
        type="button"
        onClick={() => reset()}
        style={{
          marginTop: "1rem",
          padding: "0.6rem 1.2rem",
          cursor: "pointer",
        }}
      >
        Retry
      </button>
    </main>
  );
}