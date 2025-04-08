import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";

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
      <ProtectedRoute path="/admin/menu" component={MenuPage} role="admin" />
      <ProtectedRoute path="/admin/orders" component={OrdersPage} role="admin" />
      <ProtectedRoute path="/admin/tables" component={TablesPage} role="admin" />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
