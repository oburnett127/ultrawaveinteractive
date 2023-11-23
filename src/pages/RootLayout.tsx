import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import MainNavigation from '../components/MainNavigation';

function RootLayout() {
  const navigate = useNavigate();
  
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

  function adminLoginOnClickHandler() {
    const authPageUrl = '/auth';
    
    navigate(authPageUrl);
  };

  return (
    <div>
      <div style={headerStyle}>
        <MainNavigation />
        <button type="button" style={buttonStyle} onClick={adminLoginOnClickHandler}>Admin Login</button>
      </div>

      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
}

export default RootLayout;
