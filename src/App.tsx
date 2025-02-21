
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ViewDocuments from './pages/ViewDocuments';
import ProcessDocuments from './pages/ProcessDocuments';
import ViewDocument from './pages/ViewDocument';
import ManageUsers from './pages/ManageUsers';
import ManageLiaisons from './pages/ManageLiaisons';
import Layout from './components/Layout';
import Home from './pages/Home';
import Auth from './pages/Auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/documents" element={<ViewDocuments />} />
            <Route path="/process" element={<ProcessDocuments />} />
            <Route path="/documents/:id" element={<ViewDocument />} />
            <Route path="/users" element={<ManageUsers />} />
            <Route path="/liaisons" element={<ManageLiaisons />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Home />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
