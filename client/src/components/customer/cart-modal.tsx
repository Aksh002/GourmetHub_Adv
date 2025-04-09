import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CartItem } from "@shared/schema";
import { Minus, Plus, Trash2, Info, ShoppingCart } from "lucide-react";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  updateQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  subtotal: number;
  tax: number;
  total: number;
  formatPrice: (price: number) => string;
  onPlaceOrder: () => void;
  isPending: boolean;
  hasActiveOrder: boolean;
}

export default function CartModal({
  isOpen,
  onClose,
  cartItems,
  updateQuantity,
  removeItem,
  subtotal,
  tax,
  total,
  formatPrice,
  onPlaceOrder,
  isPending,
  hasActiveOrder,
}: CartModalProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md glossy border-l border-border/40">
        <SheetHeader className="pb-4 border-b border-border/40">
          <SheetTitle className="text-xl flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Order
          </SheetTitle>
        </SheetHeader>
        
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh]">
            <div className="text-4xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground text-center max-w-xs">
              Add items from the menu to start your order
            </p>
            <SheetClose asChild>
              <Button className="mt-6" variant="outline">
                Browse Menu
              </Button>
            </SheetClose>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 my-6 max-h-[50vh] pr-4">
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-2 border-b border-border/20 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPrice(item.price)} per item
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-border/40 rounded-md">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-r-none"
                          onClick={() => {
                            if (item.quantity > 1) {
                              updateQuantity(item.id, item.quantity - 1);
                            } else {
                              removeItem(item.id);
                            }
                          }}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <div className="w-8 text-center">{item.quantity}</div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-l-none"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="space-y-4">
              <div className="bg-background/20 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Tax (8%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t border-border pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-gradient">{formatPrice(total)}</span>
                </div>
              </div>
              
              {hasActiveOrder && (
                <Alert className="bg-orange-500/10 border-orange-500/20">
                  <Info className="h-4 w-4 text-orange-500" />
                  <AlertTitle>Active Order In Progress</AlertTitle>
                  <AlertDescription className="text-sm">
                    You already have an active order for this table. Please wait until it's completed before placing a new order.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                onClick={onPlaceOrder}
                disabled={isPending || hasActiveOrder || cartItems.length === 0}
                className="w-full btn-glow"
              >
                {isPending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Place Order"
                )}
              </Button>
              
              <SheetClose asChild>
                <Button variant="outline" className="w-full">
                  Continue Browsing
                </Button>
              </SheetClose>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}