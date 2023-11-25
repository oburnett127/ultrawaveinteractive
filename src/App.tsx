import React, { useState } from 'react';
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RootLayout from './pages/RootLayout';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import StakeholdersPage from './pages/StakeholdersPage';
import ContactPage from './pages/ContactPage';
import CareersPage from './pages/CareersPage';
import CareerDetailPage from './pages/CareerDetailPage';
import AuthenticationPage from './pages/AuthenticationPage';
import LogoutPage from './pages/LogoutPage';
import NotFoundPage from './pages/NotFoundPage';
import ErrorPage from './pages/ErrorPage';
import { UserContext } from './components/UserContext';

interface User {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

function App() {
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<RootLayout />}>
        <Route index element={<HomePage />}></Route>
        <Route path="/about" element={<AboutPage />}></Route>
        <Route path="/services" element={<ServicesPage />}></Route>
        <Route path="/stakeholders" element={<StakeholdersPage />}></Route>
        <Route path="/contact" element={<ContactPage />}></Route>
        <Route path="/careers" element={<CareersPage />}></Route>
        <Route path="/careers/:id" element={<CareerDetailPage />}></Route>
        <Route path="/auth" element={<AuthenticationPage />}></Route>
        <Route path="/logout" element={<LogoutPage />}></Route>
        <Route path="/error" element={<ErrorPage />}></Route>
        <Route path="*" element={<NotFoundPage />}></Route>
      </Route>
    )
  );

  return (
    <UserContext.Provider value={{ user, setUser, isLoggedIn, setIsLoggedIn }}>    
      <div className={"App"}>
        <RouterProvider router={router} />
      </div>
    </UserContext.Provider>
  );
}

export default App;
