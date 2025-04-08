import { OrderWithItems } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, formatTimeAgo } from "@/lib/utils";
import { 
  FileText, 
  UtensilsCrossed, 
  Coffee, 
  Receipt,
  ArrowRight,
  Clock,
  CheckCircle2,
  Loader2
} from "lucide-react";

interface OrderQueueProps {
  placedOrders: OrderWithItems[];
  preparingOrders: OrderWithItems[];
  servedOrders: OrderWithItems[];
  billingOrders: OrderWithItems[];
}

export default function OrderQueue({
  placedOrders,
  preparingOrders,
  servedOrders,
  billingOrders,
}: OrderQueueProps) {
  const [processingOrderIds, setProcessingOrderIds] = useState<number[]>([]);
  const { toast } = useToast();

  // Update order status mutation
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      setProcessingOrderIds((prev) => [...prev, orderId]);
      const response = await apiRequest(
        "PATCH",
        `/api/orders/${orderId}/status`,
        { status }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables/with-orders"] });
    },
    onError: (error) => {
      toast({
        title: "Error updating order",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: (_, __, variables) => {
      setProcessingOrderIds((prev) => 
        prev.filter((id) => id !== variables.orderId)
      );
    },
  });

  // Handler for status updates
  const handleUpdateStatus = (orderId: number, newStatus: string) => {
    updateOrderStatus.mutate({ orderId, status: newStatus });
  };

  // Render a single order card
  const renderOrderCard = (order: OrderWithItems, actionButton: JSX.Element) => {
    const isProcessing = processingOrderIds.includes(order.id);
    
    return (
      <div key={order.id} className="border rounded-lg p-3 bg-white">
        <div className="flex justify-between">
          <span className="font-medium">Table {order.tableId}</span>
          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
            {formatTimeAgo(order.createdAt)}
          </span>
        </div>
        <div className="text-sm text-gray-500 mt-1">Order #{order.id}</div>
        <div className="flex justify-between mt-2 text-sm">
          <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
          <span className="text-gray-500">
            <Clock className="h-4 w-4 inline mr-1" />
            {formatTimeAgo(order.createdAt)}
          </span>
        </div>
        <div className="mt-2 max-h-24 overflow-y-auto">
          <ul className="text-xs text-gray-600">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between py-1">
                <span>{item.quantity}x {item.menuItem.name}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </div>
        {isProcessing ? (
          <Button disabled className="w-full mt-3 py-1 text-sm">
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Processing...
          </Button>
        ) : (
          actionButton
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Placed Orders Column */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900">Placed ({placedOrders.length})</h3>
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <FileText className="h-4 w-4 text-amber-600" />
          </div>
        </div>
        
        <div className="space-y-3">
          {placedOrders.length > 0 ? (
            placedOrders.map((order) => 
              renderOrderCard(
                order,
                <Button
                  variant="outline"
                  className="w-full mt-3 border-blue-500 text-blue-500 hover:bg-blue-50 hover:text-blue-600"
                  onClick={() => handleUpdateStatus(order.id, "under_process")}
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Start Preparing
                </Button>
              )
            )
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No new orders
            </div>
          )}
        </div>
      </div>
      
      {/* Preparing Orders Column */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900">Preparing ({preparingOrders.length})</h3>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <UtensilsCrossed className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        
        <div className="space-y-3">
          {preparingOrders.length > 0 ? (
            preparingOrders.map((order) => 
              renderOrderCard(
                order,
                <Button
                  variant="outline"
                  className="w-full mt-3 border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600"
                  onClick={() => handleUpdateStatus(order.id, "served")}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark Served
                </Button>
              )
            )
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No orders being prepared
            </div>
          )}
        </div>
      </div>
      
      {/* Served Orders Column */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900">Served ({servedOrders.length})</h3>
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <Coffee className="h-4 w-4 text-green-600" />
          </div>
        </div>
        
        <div className="space-y-3">
          {servedOrders.length > 0 ? (
            servedOrders.map((order) => 
              renderOrderCard(
                order,
                <Button
                  variant="outline"
                  className="w-full mt-3 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => handleUpdateStatus(order.id, "completed")}
                >
                  <Receipt className="h-4 w-4 mr-1" />
                  Complete & Generate Bill
                </Button>
              )
            )
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No served orders
            </div>
          )}
        </div>
      </div>
      
      {/* Billing Orders Column */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900">Bill Payment ({billingOrders.length})</h3>
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <Receipt className="h-4 w-4 text-red-600" />
          </div>
        </div>
        
        <div className="space-y-3">
          {billingOrders.length > 0 ? (
            billingOrders.map((order) => 
              renderOrderCard(
                order,
                <Button
                  variant="outline"
                  className="w-full mt-3 border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600"
                  onClick={() => handleUpdateStatus(order.id, "paid")}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark as Paid
                </Button>
              )
            )
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No bills awaiting payment
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
