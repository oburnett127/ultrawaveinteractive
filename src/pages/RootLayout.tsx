import React from "react";
import { Outlet } from 'react-router-dom';
import MainNavigation from '../components/MainNavigation';

function RootLayout() {

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
  };

  return (
    <div>
      <div style={headerStyle}>
        <MainNavigation />
      </div>
      <Outlet />
    </div>
  );
}

export default RootLayout;
