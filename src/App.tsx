import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ErrorPage from './pages/ErrorPage';

function App() {

  return (   
    <div className={"App"}>
    <BrowserRouter>
      <Routes>
        <Route path="/">
          <Route index element={<HomePage />}></Route>
          <Route path="/error" element={<ErrorPage />}></Route>
          <Route path="*" element={<NotFoundPage />}></Route>
        </Route>
      </Routes>
    </BrowserRouter>
    </div>
  );
}

export default App;
