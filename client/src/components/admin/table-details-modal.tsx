import { TableWithOrder } from "@/types/table-types";
import { Button } from "@/components/ui/button";
import { formatPrice, formatTimeAgo, getOrderStatusText } from "@/lib/utils";
import { X, UtensilsCrossed, Coffee, Receipt, Printer } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface TableDetailsModalProps {
  table: TableWithOrder;
  onClose: () => void;
}

export default function TableDetailsModal({ table, onClose }: TableDetailsModalProps) {
  const { toast } = useToast();
  const [processingAction, setProcessingAction] = useState(false);
  
  // Order status update mutation
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      setProcessingAction(true);
      const response = await apiRequest(
        "PATCH",
        `/api/orders/${orderId}/status`,
        { status }
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables/with-orders"] });
      
      toast({
        title: "Order updated",
        description: `Order status changed to ${getOrderStatusText(data.status)}`
      });
      
      // If the order is now paid or there was no order, close the modal
      if (data.status === "paid" || !table.order) {
        onClose();
      }
    },
    onError: (error) => {
      toast({
        title: "Error updating order",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setProcessingAction(false);
    }
  });

  // Calculate action buttons based on current order status
  const getActionButtons = () => {
    if (!table.order) return null;
    
    const { id, status } = table.order;
    
    switch(status) {
      case 'placed':
        return (
          <Button 
            onClick={() => updateOrderStatus.mutate({ orderId: id, status: 'under_process' })}
            className="bg-blue-500 hover:bg-blue-600 text-white"
            disabled={processingAction}
          >
            <UtensilsCrossed className="mr-2 h-5 w-5" />
            Start Preparing
          </Button>
        );
      case 'under_process':
        return (
          <Button 
            onClick={() => updateOrderStatus.mutate({ orderId: id, status: 'served' })}
            className="bg-green-500 hover:bg-green-600 text-white"
            disabled={processingAction}
          >
            <Coffee className="mr-2 h-5 w-5" />
            Mark as Served
          </Button>
        );
      case 'served':
        return (
          <Button 
            onClick={() => updateOrderStatus.mutate({ orderId: id, status: 'completed' })}
            className="bg-red-500 hover:bg-red-600 text-white"
            disabled={processingAction}
          >
            <Receipt className="mr-2 h-5 w-5" />
            Complete & Generate Bill
          </Button>
        );
      case 'completed':
        return (
          <Button 
            onClick={() => updateOrderStatus.mutate({ orderId: id, status: 'paid' })}
            className="bg-green-500 hover:bg-green-600 text-white"
            disabled={processingAction}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="mr-2 h-5 w-5"
            >
              <path d="M16 2v4a2 2 0 0 0 2 2h4" />
              <path d="M22 6v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h12z" />
              <path d="M14 2v4a2 2 0 0 1-2 2H4" />
              <path d="M8 16v-6" />
              <path d="M12 16v-3" />
              <path d="M16 16v-6" />
            </svg>
            Mark as Paid
          </Button>
        );
      default:
        return null;
    }
  };

  // Calculate total
  const getOrderTotals = () => {
    if (!table.order) return { subtotal: 0, tax: 0, serviceCharge: 0, total: 0 };
    
    const subtotal = table.order.items.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );
    
    const tax = Math.round(subtotal * 0.1); // 10% tax
    const serviceCharge = Math.round(subtotal * 0.05); // 5% service charge
    const total = subtotal + tax + serviceCharge;
    
    return { subtotal, tax, serviceCharge, total };
  };

  const { subtotal, tax, serviceCharge, total } = getOrderTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-lg max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-poppins font-semibold text-gray-900">
            Table {table.tableNumber} - Order Details
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          {table.order ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-medium">Order #{table.order.id}</h3>
                  <p className="text-sm text-gray-500">Placed {formatTimeAgo(table.order.createdAt)}</p>
                </div>
                <div>
                  <span className={`px-3 py-1 text-white text-sm rounded-full ${
                    table.order.status === "placed" 
                      ? "bg-amber-500" 
                      : table.order.status === "under_process" 
                        ? "bg-blue-500" 
                        : table.order.status === "served" 
                          ? "bg-green-500" 
                          : "bg-red-500"
                  }`}>
                    {getOrderStatusText(table.order.status)}
                  </span>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2">Order Items</h4>
                <div className="space-y-3">
                  {table.order.items.map((item) => (
                    <div key={item.id} className="flex justify-between p-3 border rounded-lg">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden mr-3">
                          <img 
                            src={`https://source.unsplash.com/featured/?food,${item.menuItem.name.replace(/\s+/g, '')}`}
                            className="w-full h-full object-cover" 
                            alt={item.menuItem.name} 
                          />
                        </div>
                        <div>
                          <h5 className="font-medium">{item.menuItem.name}</h5>
                          <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="font-medium">{formatPrice(item.price * item.quantity)}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Tax (10%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Service Charge (5%)</span>
                  <span>{formatPrice(serviceCharge)}</span>
                </div>
                <div className="flex justify-between font-medium text-orange-600 pt-3 mt-3 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
              
              <div className="flex flex-col space-y-3">
                {getActionButtons()}
                
                <Button variant="outline" className="flex items-center justify-center">
                  <Printer className="mr-2 h-5 w-5" />
                  Print Order Details
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <line x1="3" x2="21" y1="9" y2="9" />
                <path d="m12 16 1 2 2-4 2 6 1-4" />
                <line x1="8" x2="8" y1="16" y2="16" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Table {table.tableNumber} is vacant</h3>
              <p className="mt-2 text-gray-500">This table doesn't have any active orders.</p>
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="mt-6"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
