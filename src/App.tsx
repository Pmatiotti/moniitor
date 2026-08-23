import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ManagerRoute } from "@/components/auth/ManagerRoute";
import { TourProvider } from "@/contexts/TourContext";
import { withFeatureAccess } from "@/components/subscription/withFeatureAccess";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Plans from "./pages/Plans";
import About from "./pages/About";
import VerifyEmail from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import Portfolio from "./pages/Portfolio";
import Dividends from "./pages/Dividends";
import CRM from "./pages/CRM";
import Alerts from "./pages/Alerts";
import Performance from "./pages/Performance";
import Education from "./pages/Education";
import Assistant from "./pages/Assistant";
import Goals from "./pages/Goals";
import Rebalancing from "./pages/Rebalancing";
import Planning from "./pages/Planning";
import Finances from "./pages/Finances";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import Invite from "./pages/Invite";
import NotFound from "./pages/NotFound";
import Patrimony from "./pages/Patrimony";
import PublicStock from "./pages/PublicStock";
import PublicStockList from "./pages/PublicStockList";
import PublicFII from "./pages/PublicFII";
import TickerHub from "./pages/TickerHub";
import TickerAnalysis from "./pages/TickerAnalysis";
const Admin = lazy(() => import("./pages/Admin"));
const EducationAdmin = lazy(() => import("./pages/EducationAdmin"));
const Management = lazy(() => import("./pages/Management"));
const ClientDetails = lazy(() => import("./pages/ClientDetails"));

// Protected pages with feature access control
const ProtectedAlerts = withFeatureAccess(Alerts, 'alerts', { showDialog: false });
const ProtectedPlanning = withFeatureAccess(Planning, 'planning', { showDialog: false });
const ProtectedCRM = withFeatureAccess(CRM, 'crm', { showDialog: false });
const ProtectedAssistant = withFeatureAccess(Assistant, 'ai_assistant', { showDialog: false });
const ProtectedRebalancing = withFeatureAccess(Rebalancing, 'auto_rebalancing', { showDialog: false });

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      
      // Criar snapshot automaticamente no login
      if (event === 'SIGNED_IN' && session) {
        // Usar sessionStorage para evitar execuções duplicadas na mesma sessão
        const snapshotKey = `snapshot_created_${session.user.id}_${new Date().toDateString()}`;
        const dividendsKey = `dividends_checked_${session.user.id}_${new Date().toDateString()}`;
        
        // Usar setTimeout para não bloquear o fluxo de autenticação
        setTimeout(() => {
          // Criar snapshot do portfolio automaticamente
          if (!sessionStorage.getItem(snapshotKey)) {
            sessionStorage.setItem(snapshotKey, 'true');
            supabase.functions.invoke('create-portfolio-snapshot')
              .then(({ error }) => {
                if (error) {
                  console.error('Erro ao criar snapshot automático:', error);
                } else {
                  console.log('Snapshot do portfolio criado automaticamente no login');
                }
              });
          }
          
          // Verificar novos proventos automaticamente
          if (!sessionStorage.getItem(dividendsKey)) {
            sessionStorage.setItem(dividendsKey, 'true');
            supabase.functions.invoke('check-upcoming-dividends')
              .then(({ data, error }) => {
                if (error) {
                  console.error('Erro ao verificar proventos:', error);
                } else {
                  console.log('Verificação de proventos concluída:', data);
                }
              });
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" />;
};

// Componente auxiliar para redirect de URLs antigas
const RedirectToTicker = () => {
  const { ticker } = useParams();
  return <Navigate to={`/ticker/${ticker}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TourProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/invite/:token" element={<Invite />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/about" element={<About />} />
          {/* Nova estrutura unificada MONIITOR Ticker */}
          <Route path="/ticker" element={<TickerHub />} />
          <Route path="/ticker/:ticker" element={<TickerAnalysis />} />
          
          {/* Redirects para manter URLs antigas funcionando */}
          <Route path="/acoes" element={<Navigate to="/ticker" replace />} />
          <Route path="/acoes/:ticker" element={<RedirectToTicker />} />
          <Route path="/fundos/:ticker" element={<RedirectToTicker />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <Portfolio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dividends"
            element={
              <ProtectedRoute>
                <Dividends />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm"
            element={
              <ProtectedRoute>
                <ProtectedCRM />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/client/:clientId"
            element={
              <ProtectedRoute>
                <ManagerRoute>
                  <Suspense fallback={
                    <div className="flex items-center justify-center min-h-screen">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  }>
                    <ClientDetails />
                  </Suspense>
                </ManagerRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <ProtectedAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/performance"
            element={
              <ProtectedRoute>
                <Performance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/education"
            element={
              <ProtectedRoute>
                <Education />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute>
                <ProtectedAssistant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <Goals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rebalancing"
            element={
              <ProtectedRoute>
                <ProtectedRebalancing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/planning"
            element={
              <ProtectedRoute>
                <ProtectedPlanning />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <Suspense fallback={
                    <div className="flex items-center justify-center min-h-screen">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  }>
                    <Admin />
                  </Suspense>
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/education-admin"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <Suspense fallback={
                    <div className="flex items-center justify-center min-h-screen">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  }>
                    <EducationAdmin />
                  </Suspense>
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/management"
            element={
              <ProtectedRoute>
                <ManagerRoute>
                  <Suspense fallback={
                    <div className="flex items-center justify-center min-h-screen">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  }>
                    <Management />
                  </Suspense>
                </ManagerRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances"
            element={
              <ProtectedRoute>
                <Finances />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patrimony"
            element={
              <ProtectedRoute>
                <Patrimony />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <Subscription />
              </ProtectedRoute>
            }
          />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TourProvider>
  </QueryClientProvider>
);

export default App;
