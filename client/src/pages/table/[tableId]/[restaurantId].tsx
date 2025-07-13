import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TablePage() {
  const { tableId, restaurantId } = useParams();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Store table and restaurant info in session storage for later use
  useEffect(() => {
    if (tableId && restaurantId) {
      sessionStorage.setItem('currentTableId', tableId);
      sessionStorage.setItem('currentRestaurantId', restaurantId);
    }
  }, [tableId, restaurantId]);

  // Fetch restaurant details
  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/restaurants/${restaurantId}`);
      return res.json();
    },
    enabled: !!restaurantId
  });

  // Redirect logic
  useEffect(() => {
    if (!tableId || !restaurantId) {
      toast({
        title: "Invalid QR Code",
        description: "The scanned QR code is invalid.",
        variant: "destructive"
      });
      navigate("/");
      return;
    }

    // If user is not logged in, redirect to auth page
    if (!user) {
      navigate("/auth");
      return;
    }

    // If user is logged in and table/restaurant are valid, redirect to menu
    if (user && restaurant) {
      navigate(`/menu/${restaurantId}`);
    }
  }, [user, tableId, restaurantId, restaurant]);

  if (isLoadingRestaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold">Welcome to {restaurant?.name}</h1>
        <p className="text-gray-600">Table {tableId}</p>
        
        {!user ? (
          <div className="space-y-4">
            <p>Please log in or register to continue</p>
            <Button 
              className="w-full" 
              onClick={() => navigate("/auth")}
            >
              Proceed to Login
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p>Redirecting to menu...</p>
            <Button 
              className="w-full" 
              onClick={() => navigate(`/menu/${restaurantId}`)}
            >
              View Menu
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 