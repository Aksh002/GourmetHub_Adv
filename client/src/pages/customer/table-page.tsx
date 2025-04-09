import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, QrCode, Utensils } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function TablePage() {
  const { tableId } = useParams();
  const [, navigate] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Parse table ID
  const parsedTableId = parseInt(tableId || "0");

  // Verify table exists
  const { 
    data: table, 
    isLoading: isTableLoading, 
    isError 
  } = useQuery({
    queryKey: ["/api/tables", parsedTableId],
    queryFn: () => 
      fetch(`/api/tables/${parsedTableId}`).then(res => {
        if (!res.ok) {
          throw new Error("Table not found");
        }
        return res.json();
      }),
    enabled: !!parsedTableId,
  });

  // Redirect to menu if user is already logged in
  useEffect(() => {
    if (!isAuthLoading && user && table) {
      navigate(`/customer/menu?table=${parsedTableId}`);
    }
  }, [user, isAuthLoading, table, parsedTableId, navigate]);
  
  const isLoading = isAuthLoading || isTableLoading;
  
  const handleLogin = () => {
    navigate(`/auth?returnUrl=${encodeURIComponent(`/customer/menu?table=${parsedTableId}`)}`);
  };

  return (
    <div className="min-h-screen stars-bg flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md w-full glossy gradient-border rounded-3xl p-8 backdrop-blur-md">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading table information...</p>
          </div>
        ) : isError ? (
          <div className="py-8">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Invalid Table</h2>
            <p className="text-muted-foreground mb-6">
              This table QR code is invalid or the table doesn't exist.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="bg-primary/20 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <QrCode className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold font-space text-gradient mb-2">
                Table #{table.tableNumber}
              </h1>
              <p className="text-muted-foreground">
                Welcome to Gourmet Hub! Please log in to access the menu and place your order.
              </p>
            </div>
            
            <div className="flex flex-col gap-4">
              <Alert className="bg-primary/10 border-primary/20">
                <Utensils className="h-4 w-4" />
                <AlertTitle>Ready to order?</AlertTitle>
                <AlertDescription>
                  Access our digital menu and order directly from your table. No need to wait for service.
                </AlertDescription>
              </Alert>
              
              <Button onClick={handleLogin} className="btn-glow">
                Continue to Menu
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}