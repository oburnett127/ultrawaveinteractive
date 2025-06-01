// components/ProtectedRoute.js
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function ProtectedRoute({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    //console.log("ProtectedRoute - session:", session);
    //console.log("ProtectedRoute - status:", status);

    if (status === "unauthenticated") {
      // Redirect to sign-in page if not authenticated
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    // Optionally, show a loading state while checking authentication
    return <div>Loading...</div>;
  }

  // Render the protected content only if the user is authenticated
  return <>{session ? children : null}</>;
}
