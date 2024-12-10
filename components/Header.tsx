import React from 'react';
import { useSession, signIn, signOut } from "next-auth/react";

const Header = () => {
  const { data: session } = useSession();

  if (session) {
    return (
      <div>
        <p>Welcome, {session.user?.name}!</p>
        <button onClick={() => signOut()}>Sign Out</button>
      </div>
    );
  }

  return (
    <div>
      <p>You are not signed in.</p>
      <button onClick={() => signIn("google")}>Sign In with Google</button>
    </div>
  );
}

export default Header;
