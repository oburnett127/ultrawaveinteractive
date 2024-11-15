import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ErrorPage from './pages/ErrorPage';
import Footer from './components/Footer';
import PrivacyPolicyPage from './pages/PrivacyPolicy';
import TermsOfServicePage from './pages/TermsOfServicePage';
import CookiePolicyPage from './pages/CookiePolicyPage';

function App() {

  return (   
    <div className={"App"}>
    <BrowserRouter>
      <Routes>
        <Route path="/">
          <Route index element={<HomePage />}></Route>
          <Route path="privacy-policy" element={<PrivacyPolicyPage />}></Route>
          <Route path="terms-of-service" element={<TermsOfServicePage />}></Route>
          <Route path="cookie-policy" element={<CookiePolicyPage />}></Route>
          <Route path="/error" element={<ErrorPage />}></Route>
          <Route path="*" element={<NotFoundPage />}></Route>
        </Route>
      </Routes>
    </BrowserRouter>
    <Footer />
    </div>
  );
}

export default App;
