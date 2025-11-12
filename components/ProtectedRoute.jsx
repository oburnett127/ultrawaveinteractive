// components/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

/**
 * Error boundary wrapper so auth logic never crashes the app.
 */
class ProtectedRouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("ProtectedRoute error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            color: "#b00",
            background: "#fee",
          }}
        >
          <h2>⚠️ Authentication Error</h2>
          <p>Something went wrong while verifying your session.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Main protected-route component.
 * Prevents unauthenticated access to children.
 */
export default function ProtectedRoute({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated" && !redirecting) {
      setRedirecting(true);
      (async () => {
        try {
          console.warn(
            "ProtectedRoute: no active session, redirecting to sign-in..."
          );
          await router.push("/auth/signin");
        } catch (err) {
          console.error("Redirect error:", err);
        } finally {
          setRedirecting(false);
        }
      })();
    }
  }, [status, router, redirecting]);

  /** Loading or redirecting state */
  if (status === "loading" || redirecting) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "2rem",
          color: "#888",
        }}
        role="status"
        aria-busy="true"
      >
        Checking authentication…
      </div>
    );
  }

  /** Explicitly block content if session missing (avoids flash of protected data) */
  if (!session) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "2rem",
          color: "#b00",
        }}
        role="alert"
      >
        You must be signed in to view this page.
      </div>
    );
  }

  /** Authenticated — render protected content */
  return <ProtectedRouteErrorBoundary>{children}</ProtectedRouteErrorBoundary>;
}
