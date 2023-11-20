import React from 'react';
import { Outlet } from 'react-router-dom';
import MainNavigation from '../components/MainNavigation';
import './RootLayout.module.css';

function RootLayout() {
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

  return (
    <div>
      <div style={headerStyle}>
        <MainNavigation />
        <button type="button" style={buttonStyle}>Admin Login</button>
      </div>

      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
}

export default RootLayout;
