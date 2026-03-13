import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Calendario from "./pages/Calendario";
import Escalas from "./pages/Escalas";
import Avisos from "./pages/Avisos";
import Estudos from "./pages/Estudos";

import Financeiro from "./pages/Financeiro";
import Perfil from "./pages/Perfil";
import AdminMembros from "./pages/AdminMembros";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
    <Route path="/calendario" element={<ProtectedRoute><AppLayout><Calendario /></AppLayout></ProtectedRoute>} />
    <Route path="/escalas" element={<ProtectedRoute><AppLayout><Escalas /></AppLayout></ProtectedRoute>} />
    <Route path="/avisos" element={<ProtectedRoute><AppLayout><Avisos /></AppLayout></ProtectedRoute>} />
    <Route path="/estudos" element={<ProtectedRoute><AppLayout><Estudos /></AppLayout></ProtectedRoute>} />
    
    <Route path="/financeiro" element={<ProtectedRoute><AppLayout><Financeiro /></AppLayout></ProtectedRoute>} />
    <Route path="/perfil" element={<ProtectedRoute><AppLayout><Perfil /></AppLayout></ProtectedRoute>} />
    <Route path="/admin/membros" element={<ProtectedRoute><AdminRoute><AppLayout><AdminMembros /></AppLayout></AdminRoute></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
