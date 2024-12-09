import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

type ProtectedRouteProps = {
  children: React.ReactNode; // Components to render if the user is authenticated
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    // Optionally, show a loading indicator while the authentication state is being determined
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // If the user is not authenticated, redirect them to the login page
    loginWithRedirect(); // Automatically redirect to the Auth0 login page
    return <div>Redirecting to login...</div>;
  }

  // If authenticated, render the child components
  return <>{children}</>;
};

export default ProtectedRoute;
