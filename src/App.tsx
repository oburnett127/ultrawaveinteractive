import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserContext } from './components/UserContext';
import ProtectedRoute from './ProtectedRoute';
import HomePage from './pages/HomePage';
import RootLayout from './pages/RootLayout';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import StakeholdersPage from './pages/StakeholdersPage';
import StakeholderPostPage from './pages/StakeholderPostPage';
import ContactPage from './pages/ContactPage';
import CareersPage from './pages/CareersPage';
import CareerDetailPage from './pages/CareerDetailPage';
import CareerPostPage from './pages/CareerPostPage';
import CareerUpdatePage from './pages/CareerUpdatePage';
import CareerDeletePage from './pages/CareerDeletePage';
import AuthenticationPage from './pages/AuthenticationPage';
import LogoutPage from './pages/LogoutPage';
import NotFoundPage from './pages/NotFoundPage';
import ErrorPage from './pages/ErrorPage';

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

  useEffect(() => {
    const storedUserLoggedInInformation = localStorage.getItem('isLoggedIn');
    if (storedUserLoggedInInformation === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, isLoggedIn, setIsLoggedIn }}>    
      <div className={"App"}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route index element={<HomePage />}></Route>
            <Route path="/about" element={<AboutPage />}></Route>
            <Route path="/services" element={<ServicesPage />}></Route>
            <Route path="/stakeholders" element={<StakeholdersPage />}></Route>
            <Route path="/stakeholders/add" element={<ProtectedRoute component={StakeholderPostPage} />} />
            <Route path="/contact" element={<ContactPage />}></Route>
            <Route path="/careers" element={<CareersPage />}></Route>
            <Route path="/careers/:id" element={<CareerDetailPage />}></Route>
            <Route path="/careers/add" element={<ProtectedRoute component={CareerPostPage} />} />
            <Route path="/careers/:id/edit" element={<ProtectedRoute component={CareerUpdatePage} />} />
            <Route path="/careers/:id/delete" element={<ProtectedRoute component={CareerDeletePage} />} />
            <Route path="/auth" element={<AuthenticationPage />}></Route>
            <Route path="/logout" element={<LogoutPage />}></Route>
            <Route path="/error" element={<ErrorPage />}></Route>
            <Route path="*" element={<NotFoundPage />}></Route>
          </Route>
        </Routes>
      </BrowserRouter>
      </div>
    </UserContext.Provider>
  );
}

export default App;
