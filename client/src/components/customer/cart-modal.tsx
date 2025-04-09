import { Fragment } from "react";
import { CartItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { X, ShoppingCart, Minus, Plus } from "lucide-react";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50">
      <div className="bg-white w-full md:w-2/3 lg:w-1/2 md:rounded-lg md:max-h-[80vh] max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-poppins font-semibold text-gray-900">Your Order</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          {cartItems.length > 0 ? (
            <Fragment>
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.menuItemId} className="flex justify-between items-center border-b pb-4">
                    <div className="flex items-center">
                      <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden mr-3">
                        <img 
                          src={`https://source.unsplash.com/featured/?food,${item.name.replace(/\s+/g, '')}`} 
                          className="w-full h-full object-cover" 
                          alt={item.name} 
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">{formatPrice(item.price)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <button 
                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="mx-3 font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Tax (10%)</span>
                  <span className="font-medium">{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between font-medium mt-4 pt-4 border-t">
                  <span>Total</span>
                  <span className="font-montserrat text-lg text-orange-600">{formatPrice(total)}</span>
                </div>
              </div>
              
              <div className="flex flex-col space-y-3">
                <Button 
                  onClick={onPlaceOrder} 
                  disabled={isPending || hasActiveOrder || cartItems.length === 0}
                  className="flex items-center justify-center"
                >
                  {isPending ? (
                    <Fragment>
                      <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </Fragment>
                  ) : (
                    <Fragment>
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Place Order
                    </Fragment>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onClose}
                >
                  Continue Browsing
                </Button>
              </div>
              
              {hasActiveOrder && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                  <p className="font-medium">There is an active order for this table</p>
                  <p>You cannot place a new order until the current one is completed.</p>
                </div>
              )}
            </Fragment>
          ) : (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <ShoppingCart className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Add some delicious items from our menu</p>
              <Button variant="outline" onClick={onClose}>
                Browse Menu
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
