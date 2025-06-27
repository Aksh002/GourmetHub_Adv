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
import MenuPage from "@/pages/menu/[restaurantId]";

// Admin Pages
import DashboardPage from "@/pages/admin/dashboard-page";
import AdminMenuPage from "@/pages/admin/menu-page";
import OrdersPage from "@/pages/admin/orders-page";
import TablesPage from "@/pages/admin/tables-page";
import SetupPage from "@/pages/admin/setup-page";
import TempTablesPage from './pages/admin/temp-tables-page';

// Protected routes
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/table/:tableId" component={TablePage} />
      <Route path="/menu/:restaurantId" component={MenuPage} />
      
      {/* Admin routes - protected */}
      <ProtectedRoute path="/admin" component={DashboardPage} role="admin" />
      <ProtectedRoute path="/admin/setup" component={SetupPage} role="admin" />
      <ProtectedRoute path="/admin/menu" component={AdminMenuPage} role="admin" />
      <ProtectedRoute path="/admin/orders" component={OrdersPage} role="admin" />
      <ProtectedRoute path="/admin/tables" component={TablesPage} role="admin" />
      <ProtectedRoute path="/admin/restaurants/:restaurantId/tables" component={TempTablesPage} role="admin" />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
