
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import ProcessDocuments from "./pages/ProcessDocuments";
import ManageUsers from "./pages/ManageUsers";
import ManageLiaisons from "./pages/ManageLiaisons";
import ViewDocuments from "./pages/ViewDocuments";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Index />} />
            <Route path="process" element={<ProcessDocuments />} />
            <Route path="documents" element={<ViewDocuments />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="liaisons" element={<ManageLiaisons />} />
            <Route path="auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
