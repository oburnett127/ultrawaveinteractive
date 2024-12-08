import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));
const Footer = lazy(() => import('./components/Footer'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicyPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));

function App() {

  return (   
    <div className={"App"}>
      <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/">
            <Route index element={<HomePage />}></Route>
            <Route path="payment" element={<PaymentPage />}></Route>
            <Route path="privacy-policy" element={<PrivacyPolicyPage />}></Route>
            <Route path="terms-of-service" element={<TermsOfServicePage />}></Route>
            <Route path="cookie-policy" element={<CookiePolicyPage />}></Route>
            <Route path="/error" element={<ErrorPage />}></Route>
            <Route path="*" element={<NotFoundPage />}></Route>
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
      <Footer />
    </div>
  );
}

export default App;
