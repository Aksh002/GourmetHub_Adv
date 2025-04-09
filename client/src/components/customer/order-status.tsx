import { Badge } from "@/components/ui/badge";
import { Order, OrderWithItems } from "@shared/schema";
import { 
  getOrderStatusColor, 
  getOrderStatusText, 
  formatPrice 
} from "@/lib/utils";
import { 
  Clock, 
  ShoppingBag, 
  CheckCircle2, 
  ChefHat, 
  Utensils, 
  Timer 
} from "lucide-react";

interface OrderStatusProps {
  order: OrderWithItems;
}

export default function OrderStatus({ order }: OrderStatusProps) {
  // Get status information
  const statusColor = getOrderStatusColor(order.status);
  const statusText = getOrderStatusText(order.status);
  
  // Calculate order total
  const orderTotal = order.items.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );
  
  // Status progress steps
  const statusSteps = [
    { key: "placed", icon: ShoppingBag, label: "Order Placed" },
    { key: "under_process", icon: ChefHat, label: "Preparing" },
    { key: "served", icon: Utensils, label: "Served" },
    { key: "completed", icon: CheckCircle2, label: "Completed" },
    { key: "paid", icon: CheckCircle2, label: "Paid" }
  ];
  
  // Find the current step index
  const currentStepIndex = statusSteps.findIndex(step => step.key === order.status);
  
  return (
    <div className="space-y-8">
      {/* Order header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-1">Order #{order.id}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {new Date(order.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          </div>
        </div>
        <Badge 
          className={`${statusColor} px-4 py-1 text-sm`}
        >
          {statusText}
        </Badge>
      </div>
      
      {/* Order progress */}
      <div className="relative">
        <div className="overflow-hidden h-2 text-xs flex rounded bg-background/20 mb-8 mt-4">
          <div
            style={{ width: `${(currentStepIndex + 1) * 100 / statusSteps.length}%` }}
            className="rounded bg-primary shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500"
          ></div>
        </div>
        
        <div className="grid grid-cols-5 relative">
          {statusSteps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index <= currentStepIndex;
            const isPrevious = index < currentStepIndex;
            
            return (
              <div 
                key={step.key} 
                className={`flex flex-col items-center ${
                  index === statusSteps.length - 1 ? 'col-start-5' : ''
                }`}
              >
                <div 
                  className={`rounded-full p-2 mb-2 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-glow' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <StepIcon className="h-5 w-5" />
                </div>
                <span className={`text-xs text-center ${
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Order items */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b border-border pb-2">
          Order Details
        </h3>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-start">
              <div className="flex gap-3">
                <div className="font-medium">
                  {item.quantity}x
                </div>
                <div>
                  <div className="font-medium">{item.menuItem.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatPrice(item.price)} each
                  </div>
                </div>
              </div>
              <div className="font-medium">
                {formatPrice(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Order summary */}
      <div className="bg-background/20 p-4 rounded-lg">
        <div className="flex justify-between mb-2">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(orderTotal)}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-muted-foreground">Tax (8%)</span>
          <span>{formatPrice(Math.round(orderTotal * 0.08))}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold border-t border-border pt-2 mt-2">
          <span>Total</span>
          <span className="text-gradient">{formatPrice(orderTotal + Math.round(orderTotal * 0.08))}</span>
        </div>
      </div>
      
      {/* Estimated time section */}
      {(order.status === "placed" || order.status === "under_process") && (
        <div className="p-4 rounded-lg border border-border/50 glossy-light text-center">
          <div className="flex justify-center items-center gap-2 mb-2 text-amber-500">
            <Timer className="h-5 w-5" />
            <h3 className="font-semibold">Estimated Preparation Time</h3>
          </div>
          <p className="text-muted-foreground">
            Your order is {order.status === "placed" ? "being processed" : "being prepared"} and will be ready in approximately:
          </p>
          <div className="text-2xl font-bold mt-2">
            {order.status === "placed" ? "15-20" : "5-10"} minutes
          </div>
        </div>
      )}
      
      {/* Payment status section */}
      {order.status === "completed" && (
        <div className="p-4 rounded-lg border border-border/50 glossy-light text-center">
          <div className="flex justify-center items-center gap-2 mb-2 text-green-500">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="font-semibold">Order Completed</h3>
          </div>
          <p className="text-muted-foreground">
            Your order has been completed. Please proceed to payment.
          </p>
        </div>
      )}
      
      {/* Thank you message for paid orders */}
      {order.status === "paid" && (
        <div className="p-4 rounded-lg border border-border/50 glossy-light text-center">
          <div className="flex justify-center items-center gap-2 mb-2 text-green-500">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="font-semibold">Payment Received</h3>
          </div>
          <p className="text-muted-foreground">
            Thank you for dining with us! We hope you enjoyed your meal.
          </p>
        </div>
      )}
    </div>
  );
}