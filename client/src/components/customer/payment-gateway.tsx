import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Wallet, 
  CircleDollarSign, 
  Smartphone, 
  Check, 
  Loader2 
} from "lucide-react";
import { OrderWithItems } from "@shared/schema";
import { formatPrice } from "@/lib/utils";

interface PaymentGatewayProps {
  order: OrderWithItems;
  onSuccess?: () => void;
}

export default function PaymentGateway({ order, onSuccess }: PaymentGatewayProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("credit_card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  // Calculate total amount
  const totalAmount = order.items.reduce(
    (total, item) => total + (item.price * item.quantity), 
    0
  );

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async ({ orderId, method }: { orderId: number; method: string }) => {
      return apiRequest("POST", `/api/orders/${orderId}/process-payment`, { method });
    },
    onSuccess: () => {
      setIsComplete(true);
      setIsProcessing(false);
      
      // Invalidate order queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${order.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tables/${order.tableId}/active-order`] });
      
      toast({
        title: "Payment successful",
        description: "Your payment has been processed successfully.",
        variant: "default",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Payment failed",
        description: error.message || "There was an error processing your payment.",
        variant: "destructive",
      });
    }
  });

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (paymentMethod === "credit_card") {
      if (!cardNumber || !expiryDate || !cvv) {
        toast({
          title: "Missing information",
          description: "Please fill in all credit card details.",
          variant: "destructive",
        });
        return;
      }
      
      // Basic card number validation
      if (cardNumber.replace(/\s/g, "").length !== 16) {
        toast({
          title: "Invalid card",
          description: "Please enter a valid 16-digit card number.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsProcessing(true);
    
    // In a real app, we would validate and handle the payment with a secure payment processor
    // For demo, simulate API call to process payment
    processPaymentMutation.mutate({
      orderId: order.id,
      method: paymentMethod
    });
  };

  // Format card number input with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  // Format expiry date input
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? "/" + v.substring(2, 4) : "");
    }
    
    return v;
  };

  if (isComplete) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="bg-green-50 border-b">
          <CardTitle className="flex items-center text-green-600">
            <Check className="mr-2 h-5 w-5" />
            Payment Complete
          </CardTitle>
          <CardDescription>Your order has been paid successfully</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 flex items-center justify-center rounded-full mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium mb-1">Thank You For Your Order</h3>
              <p className="text-gray-500 mb-4">Payment of {formatPrice(totalAmount)} has been processed</p>
              <Button onClick={onSuccess} className="mt-2">
                Return to Table
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="border-b">
        <CardTitle>Payment</CardTitle>
        <CardDescription>Complete your order by making a payment</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Order Summary</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.quantity} x {item.menuItem.name}
                      </span>
                      <span className="font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="payment-method">Payment Method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                <div>
                  <RadioGroupItem
                    value="credit_card"
                    id="credit_card"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="credit_card"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <CreditCard className="mb-3 h-6 w-6" />
                    Credit Card
                  </Label>
                </div>
                
                <div>
                  <RadioGroupItem
                    value="wallet"
                    id="wallet"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="wallet"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <Wallet className="mb-3 h-6 w-6" />
                    Digital Wallet
                  </Label>
                </div>
                
                <div>
                  <RadioGroupItem
                    value="cash"
                    id="cash"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="cash"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <CircleDollarSign className="mb-3 h-6 w-6" />
                    Cash On Delivery
                  </Label>
                </div>
                
                <div>
                  <RadioGroupItem
                    value="mobile"
                    id="mobile"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="mobile"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <Smartphone className="mb-3 h-6 w-6" />
                    Mobile Payment
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {paymentMethod === "credit_card" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input
                    id="card-number"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                      maxLength={5}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ""))}
                      maxLength={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "wallet" && (
              <div className="space-y-4 py-2 text-center">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <Wallet className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                  <p className="font-medium text-blue-700">You'll be redirected to your digital wallet</p>
                  <p className="text-sm text-blue-600 mt-1">Secure payment processing via linked accounts</p>
                </div>
              </div>
            )}

            {paymentMethod === "mobile" && (
              <div className="space-y-4 py-2 text-center">
                <div className="bg-purple-50 p-6 rounded-lg">
                  <Smartphone className="h-12 w-12 text-purple-500 mx-auto mb-3" />
                  <p className="font-medium text-purple-700">Mobile payment link will be sent to your phone</p>
                  <p className="text-sm text-purple-600 mt-1">Complete payment securely on your mobile device</p>
                </div>
              </div>
            )}

            {paymentMethod === "cash" && (
              <div className="space-y-4 py-2 text-center">
                <div className="bg-amber-50 p-6 rounded-lg">
                  <CircleDollarSign className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                  <p className="font-medium text-amber-700">Pay in cash when your order is served</p>
                  <p className="text-sm text-amber-600 mt-1">Your server will collect payment at your table</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onSuccess && onSuccess()}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              <>Pay {formatPrice(totalAmount)}</>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}