import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
  role,
}: {
  path: string;
  component: () => React.JSX.Element;
  role?: string;
}) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [shouldCheckRestaurant, setShouldCheckRestaurant] = useState(false);
  
  // Only check restaurant setup status for admin users and admin routes, excluding the setup route
  const isAdminRoute = path.startsWith("/admin");
  const isSetupRoute = path === "/admin/setup";
  
  useEffect(() => {
    // Only check restaurant setup for admin routes (excluding setup route)
    if (user && user.role === "admin" && isAdminRoute && !isSetupRoute) {
      setShouldCheckRestaurant(true);
    } else {
      setShouldCheckRestaurant(false);
    }
  }, [user, isAdminRoute, isSetupRoute]);
  
  // Query to check if restaurant is configured
  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery({
    queryKey: ['/api/restaurant'],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/restaurant");
        return await res.json();
      } catch (error) {
        // If restaurant doesn't exist yet, return null
        return null;
      }
    },
    enabled: shouldCheckRestaurant,
  });

  if (isLoading || (shouldCheckRestaurant && isLoadingRestaurant)) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (role && user.role !== role) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }
  
  // For admin users, check if they need to complete setup (except on the setup page)
  if (shouldCheckRestaurant && (!restaurant || !restaurant.isConfigured)) {
    return (
      <Route path={path}>
        <Redirect to="/admin/setup" />
      </Route>
    );
  }
  
  // For setup page, if restaurant is configured, redirect to dashboard
  if (isSetupRoute && restaurant?.isConfigured) {
    return (
      <Route path={path}>
        <Redirect to="/admin" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
