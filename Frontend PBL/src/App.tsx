import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import OverviewPage from "@/pages/OverviewPage";
import DevicesPage from "@/pages/DevicesPage";
import SecurityEventsPage from "@/pages/SecurityEventsPage";
import AlertsPage from "@/pages/AlertsPage";
import SoarPage from "@/pages/SoarPage";
import BlockchainPage from "@/pages/BlockchainPage";
import AiAnalysisPage from "@/pages/AiAnalysisPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const RootRedirect = () => {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/overview" : "/login"} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/overview" element={<OverviewPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/events" element={<SecurityEventsPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/soar" element={<SoarPage />} />
              <Route path="/blockchain" element={<BlockchainPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="/ai-analysis"
                element={
                  <ProtectedRoute adminOnly>
                    <AiAnalysisPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute adminOnly>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;