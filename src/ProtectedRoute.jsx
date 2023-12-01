import React, { useContext } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { UserContext } from './components/UserContext';

const ProtectedRoute = ({ component: Component }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn');

  if (!isLoggedIn) {
    return <Navigate to="/auth" />;
  }

  return <Component />;
};

export default ProtectedRoute;
