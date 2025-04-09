import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/use-auth";
import { queryClient } from "./lib/queryClient";

// Pages
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import TablePage from "@/pages/customer/table-page";

// Admin Pages
import DashboardPage from "@/pages/admin/dashboard-page";
import MenuPage from "@/pages/admin/menu-page";
import OrdersPage from "@/pages/admin/orders-page";
import TablesPage from "@/pages/admin/tables-page";
import SetupPage from "@/pages/admin/setup-page";

// Protected routes
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/table/:tableId" component={TablePage} />
      
      {/* Admin routes - protected */}
      <ProtectedRoute path="/admin" component={DashboardPage} role="admin" />
      <ProtectedRoute path="/admin/setup" component={SetupPage} role="admin" />
      <ProtectedRoute path="/admin/menu" component={MenuPage} role="admin" />
      <ProtectedRoute path="/admin/orders" component={OrdersPage} role="admin" />
      <ProtectedRoute path="/admin/tables" component={TablesPage} role="admin" />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
