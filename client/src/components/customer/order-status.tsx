import { Order } from "@shared/schema";
import { getOrderStatusText } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  UtensilsCrossed, 
  Coffee, 
  Receipt,
  CreditCard 
} from "lucide-react";

interface OrderStatusProps {
  order: Order;
}

export default function OrderStatus({ order }: OrderStatusProps) {
  // Define steps for the order status flow
  const steps = [
    { key: 'placed', label: 'Ordered', icon: <FileText className="h-4 w-4" /> },
    { key: 'under_process', label: 'Preparing', icon: <UtensilsCrossed className="h-4 w-4" /> },
    { key: 'served', label: 'Served', icon: <Coffee className="h-4 w-4" /> },
    { key: 'completed', label: 'Billed', icon: <Receipt className="h-4 w-4" /> },
    { key: 'paid', label: 'Paid', icon: <CreditCard className="h-4 w-4" /> }
  ];

  // Find the current step index
  const currentStepIndex = steps.findIndex(step => step.key === order.status);

  // Get background color for the status badge
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'placed':
        return 'bg-amber-500';
      case 'under_process':
        return 'bg-blue-500';
      case 'served':
        return 'bg-green-500';
      case 'completed':
        return 'bg-red-500';
      case 'paid':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-poppins font-semibold text-gray-900">Current Order Status</h2>
        <Badge className={`${getStatusColor(order.status)} hover:${getStatusColor(order.status)}`}>
          {getOrderStatusText(order.status)}
        </Badge>
      </div>
      
      <div className="mt-4">
        <div className="relative">
          {/* Status Timeline */}
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <div key={step.key} className="w-1/5 text-center">
                  <div 
                    className={`
                      rounded-full h-10 w-10 flex items-center justify-center mx-auto
                      ${isCompleted 
                        ? index === 0 
                          ? 'bg-green-500 text-white' 
                          : index === 1 && isCurrent 
                            ? 'bg-amber-500 text-white'
                            : index === 2 && isCurrent 
                              ? 'bg-green-500 text-white'
                              : index === 3 && isCurrent 
                                ? 'bg-red-500 text-white'
                                : index === 4 && isCurrent
                                  ? 'bg-gray-500 text-white'
                                  : 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}
                  >
                    {step.icon}
                  </div>
                  <p className={`text-xs mt-1 font-medium ${
                    isCompleted 
                      ? index === 0 
                        ? 'text-green-500' 
                        : index === 1 && isCurrent 
                          ? 'text-amber-500'
                          : index === 2 && isCurrent 
                            ? 'text-green-500'
                            : index === 3 && isCurrent 
                              ? 'text-red-500'
                              : index === 4 && isCurrent
                                ? 'text-gray-500'
                                : 'text-green-500'
                      : 'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
          
          {/* Progress Bar */}
          <div className="absolute top-5 left-[10%] right-[10%] h-1 bg-gray-200">
            <div 
              className="absolute left-0 h-full bg-green-500" 
              style={{ 
                width: currentStepIndex >= 4 
                  ? '100%' 
                  : `${(currentStepIndex / 4) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
