import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ArrowLeft, RefreshCw, CreditCard } from "lucide-react";
import CustomerLayout from "@/components/layouts/customer-layout";
import OrderStatus from "@/components/customer/order-status";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { OrderWithItems } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function OrderPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const orderId = parseInt(id || "0");

  // Fetch order details
  const { 
    data: order, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery<OrderWithItems>({
    queryKey: ["/api/orders", orderId],
    queryFn: () => 
      fetch(`/api/orders/${orderId}`).then(res => {
        if (!res.ok) {
          throw new Error("Failed to fetch order");
        }
        return res.json();
      }),
    enabled: !!orderId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      const paymentResponse = await fetch(`/api/orders/${orderId}/payment`);
      if (!paymentResponse.ok) {
        throw new Error("Payment not found for this order");
      }
      
      const payment = await paymentResponse.json();
      const res = await apiRequest("POST", `/api/payments/${payment.id}/process`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment processed",
        description: "Your payment has been successfully processed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Redirect to auth page if not logged in
  if (!user) {
    navigate(`/auth?returnUrl=${encodeURIComponent(`/customer/order/${orderId}`)}`);
    return null;
  }

  // Redirect to menu page if order doesn't exist and we're not still loading
  if (!isLoading && !order && !isError) {
    navigate("/customer/menu");
    return null;
  }

  return (
    <CustomerLayout 
      title={`Order #${orderId}`}
      user={user}
    >
      <div className="container py-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate("/customer/menu")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Menu
          </Button>
          
          <h1 className="text-3xl font-bold font-space text-gradient">
            Order Status
          </h1>
          <p className="text-muted-foreground">
            Track your current order status and details
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading order details...</p>
          </div>
        ) : isError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {(error as Error).message || "Failed to load order details"}
            </AlertDescription>
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="bg-destructive/10"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Alert>
        ) : order ? (
          <div className="glossy gradient-border rounded-xl p-6">
            <OrderStatus order={order} />
            
            {order.status === "completed" && (
              <div className="mt-6">
                <Button 
                  className="w-full mt-4 btn-glow"
                  onClick={() => processPaymentMutation.mutate()}
                  disabled={processPaymentMutation.isPending}
                >
                  {processPaymentMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Payment...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Pay Now
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </CustomerLayout>
  );
}