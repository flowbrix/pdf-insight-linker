import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ViewDocuments from './pages/ViewDocuments';
import ProcessDocument from './pages/ProcessDocument';
import ViewDocument from './pages/ViewDocument';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ViewDocuments />} />
        <Route path="/process" element={<ProcessDocument />} />
        <Route path="/documents/:id" element={<ViewDocument />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
