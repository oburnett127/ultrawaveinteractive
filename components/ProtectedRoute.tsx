// components/ProtectedRoute.js
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: any) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
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
