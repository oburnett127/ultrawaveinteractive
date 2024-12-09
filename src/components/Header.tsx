import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const Header = () => {
  const { loginWithRedirect, logout, isAuthenticated } = useAuth0();

  return (
    <header>
      <nav>
        <h1>Ultrawave Interactive Web Design</h1>
        <ul>
          <li><a href="/">Home</a></li>
        </ul>
        {isAuthenticated ? (
            <button
                onClick={() =>
                    logout({
                        logoutParams: { returnTo: window.location.origin },
                    })
                }
            >
                Log Out
            </button>
        ) : (
            <button onClick={() => loginWithRedirect()}>
                Log In
            </button>
        )}
      </nav>
    </header>
  );
};

export default Header;
