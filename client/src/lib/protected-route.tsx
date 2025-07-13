import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
  role,
}: {
  path: string;
  component: () => React.JSX.Element;
  role?: string;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Check if this is an admin route
  const isAdminRoute = path.startsWith("/admin");
  const isSetupRoute = path === "/admin/setup";
  const shouldCheckRestaurant = isAdminRoute && !isSetupRoute && user?.role === "admin";
  
  // Query to check if restaurant is configured
  const { data: restaurant, isLoading: restaurantLoading, error: restaurantError } = useQuery({
    queryKey: ['/api/restaurant', user?.restaurantId],
    queryFn: async () => {
      if (!shouldCheckRestaurant || !user?.restaurantId) return null;
      const res = await apiRequest("GET", `/api/restaurant/${user.restaurantId}`);
      if (!res.ok) {
        // If we get a 404, it means no restaurant exists yet
        if (res.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch restaurant data");
      }
      const data = await res.json();
      console.log("[DEBUG] Fetched restaurant data:", data);
      return data;
    },
    enabled: shouldCheckRestaurant && !!user?.restaurantId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0, // Consider data as stale immediately
    gcTime: 0, // Don't keep the data in cache
  });

  // Handle navigation in useEffect
  useEffect(() => {
    if (authLoading || (shouldCheckRestaurant && restaurantLoading)) {
      return;
    }

    if (!user) {
      setLocation("/");
      return;
    }

    if (role && user.role !== role) {
      setLocation("/");
      return;
    }

    // For admin routes, handle restaurant configuration checks
    if (isAdminRoute && user.role === "admin") {
      console.log("[DEBUG] Admin route check - Restaurant data:", restaurant);
      
      // If we're on the setup route and restaurant is configured, redirect to admin dashboard
      if (isSetupRoute && restaurant?.isConfigured) {
        console.log("[DEBUG] Setup route with configured restaurant - redirecting to /admin");
        setLocation("/admin");
        return;
      }

      // If we're on any other admin route and restaurant is not configured or doesn't exist, redirect to setup
      if (!isSetupRoute && (!restaurant || !restaurant.isConfigured)) {
        console.log("[DEBUG] Admin route with unconfigured restaurant - redirecting to /admin/setup");
        setLocation("/admin/setup");
        return;
      }
    }
  }, [user, role, restaurant, authLoading, restaurantLoading, isAdminRoute, isSetupRoute, setLocation]);

  // Handle loading states
  if (authLoading || (shouldCheckRestaurant && restaurantLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If we're still loading or should redirect, don't render the component
  if (!user || (role && user.role !== role) || 
      (isAdminRoute && !isSetupRoute && (!restaurant || !restaurant.isConfigured)) ||
      (isSetupRoute && restaurant?.isConfigured)) {
    return null;
  }

  return <Component />;
}
