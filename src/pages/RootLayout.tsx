import React, { useState, useContext, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import MainNavigation from '../components/MainNavigation';
import { UserContext } from '../components/UserContext';

function RootLayout() {
  const { isLoggedIn } = useContext(UserContext);
  const navigate = useNavigate();
  const [buttonText, setButtonText] = useState("Admin Login");

  useEffect(() => {
    if(isLoggedIn) setButtonText("Logout");
    else setButtonText("Admin Login");
  }, [isLoggedIn]);

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
  };

  const buttonStyle: React.CSSProperties = {
    marginLeft: '10px',
  };

  const mainStyle: React.CSSProperties = {
    textAlign: 'center',
  };

  function adminLoginButtonHandler() {
    if(!isLoggedIn) {    
      const authPageUrl = '/auth';
      navigate(authPageUrl);
    } else {
      const logoutPageUrl = '/logout';
      navigate(logoutPageUrl);
    }
  };

  return (
    <div>
      <div style={headerStyle}>
        <MainNavigation />
        <button type="button" style={buttonStyle} onClick={adminLoginButtonHandler}>{buttonText}</button>
      </div>

      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
}

export default RootLayout;
