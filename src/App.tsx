import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { SplashScreen } from "@/components/SplashScreen";
import { PageTransition } from "@/components/PageTransition";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Lazy-loaded routes (carregam sob demanda → entrada inicial muito mais rápida)
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Escalas = lazy(() => import("./pages/Escalas"));
const Avisos = lazy(() => import("./pages/Avisos"));
const Estudos = lazy(() => import("./pages/Estudos"));
const Reposicao = lazy(() => import("./pages/Reposicao"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Firmezas = lazy(() => import("./pages/Firmezas"));
const Pontos = lazy(() => import("./pages/Pontos"));
const Perfil = lazy(() => import("./pages/Perfil"));
const AdminMembros = lazy(() => import("./pages/AdminMembros"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2min — evita refetch agressivo ao navegar
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="p-6 max-w-2xl mx-auto space-y-3 animate-pulse">
    <div className="h-32 rounded-xl bg-muted/60" />
    <div className="h-20 rounded-xl bg-muted/40" />
    <div className="h-20 rounded-xl bg-muted/40" />
  </div>
);

const AppRoutes = () => (
  <PageTransition>
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/calendario" element={<ProtectedRoute><AppLayout><Calendario /></AppLayout></ProtectedRoute>} />
        <Route path="/escalas" element={<ProtectedRoute><AppLayout><Escalas /></AppLayout></ProtectedRoute>} />
        <Route path="/avisos" element={<ProtectedRoute><AppLayout><Avisos /></AppLayout></ProtectedRoute>} />
        <Route path="/estudos" element={<ProtectedRoute><AppLayout><Estudos /></AppLayout></ProtectedRoute>} />
        <Route path="/reposicao" element={<ProtectedRoute><AppLayout><Reposicao /></AppLayout></ProtectedRoute>} />
        <Route path="/financeiro" element={<ProtectedRoute><AppLayout><Financeiro /></AppLayout></ProtectedRoute>} />
        <Route path="/firmezas" element={<ProtectedRoute><AppLayout><Firmezas /></AppLayout></ProtectedRoute>} />
        <Route path="/pontos" element={<ProtectedRoute><AppLayout><Pontos /></AppLayout></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><AppLayout><Perfil /></AppLayout></ProtectedRoute>} />
        <Route path="/admin/membros" element={<ProtectedRoute><AdminRoute><AppLayout><AdminMembros /></AppLayout></AdminRoute></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </PageTransition>
);

const SplashGate = ({ children }: { children: React.ReactNode }) => {
  const { isLoading } = useAuth();
  return (
    <>
      <SplashScreen show={isLoading} />
      {children}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UpdatePrompt />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SplashGate>
            <AppRoutes />
          </SplashGate>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
