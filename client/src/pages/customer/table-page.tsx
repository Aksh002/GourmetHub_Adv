import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import CustomerLayout from "@/components/layouts/customer-layout";
import MenuItemCard from "@/components/customer/menu-item-card";
import OrderStatus from "@/components/customer/order-status";
import CartModal from "@/components/customer/cart-modal";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MenuItem, CartItem, TableWithOrder } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TablePage() {
  const { tableId } = useParams<{ tableId: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Query for table info and active order
  const { data: tableData, isLoading: isTableLoading } = useQuery<TableWithOrder>({
    queryKey: [`/api/tables/${tableId}/active-order`],
    enabled: !!tableId,
    refetchInterval: 10000, // Refetch every 10 seconds to keep order status updated
  });

  // Query for menu items
  const { data: menuItems, isLoading: isMenuLoading } = useQuery<MenuItem[]>({
    queryKey: [`/api/menu-items`, { category: selectedCategory }],
    enabled: !!tableId,
  });

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You must be logged in to place an order");
      }
      
      if (cartItems.length === 0) {
        throw new Error("Your cart is empty");
      }

      const res = await apiRequest("POST", "/api/order-from-cart", {
        tableId: parseInt(tableId),
        items: cartItems
      });
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Order placed successfully!",
        description: "Your order has been sent to the kitchen.",
      });
      setCartItems([]);
      setCartOpen(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/tables/${tableId}/active-order`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to place order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle adding an item to cart
  const addToCart = (item: MenuItem) => {
    setCartItems((prevItems) => {
      // Check if item already exists in cart
      const existingItemIndex = prevItems.findIndex(
        (cartItem) => cartItem.menuItemId === item.id
      );

      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        const newItems = [...prevItems];
        newItems[existingItemIndex].quantity += 1;
        return newItems;
      } else {
        // Add new item to cart
        return [
          ...prevItems,
          {
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
          },
        ];
      }
    });
    
    toast({
      title: "Added to cart",
      description: `${item.name} added to your cart.`,
    });
  };

  // Handle updating cart item quantity
  const updateCartItemQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prevItems) => 
        prevItems.filter((item) => item.menuItemId !== id)
      );
    } else {
      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item.menuItemId === id ? { ...item, quantity } : item
        )
      );
    }
  };

  // Handle removing an item from cart
  const removeFromCart = (id: number) => {
    setCartItems((prevItems) => 
      prevItems.filter((item) => item.menuItemId !== id)
    );
  };

  // Calculate cart totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  // Format price to dollars
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // If no tableId, redirect to home
  useEffect(() => {
    if (!tableId) {
      navigate("/");
    }
  }, [tableId, navigate]);

  // If not logged in, redirect to auth page
  useEffect(() => {
    if (!user && !isTableLoading) {
      toast({
        title: "Authentication required",
        description: "Please log in to place an order.",
      });
      navigate(`/auth?redirect=/table/${tableId}`);
    }
  }, [user, isTableLoading, tableId, navigate, toast]);

  return (
    <CustomerLayout 
      title="The Gourmet Hub"
      tableInfo={tableData ? `Table #${tableData.tableNumber}, Floor ${tableData.floorNumber}` : "Loading..."}
      cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
      onCartClick={() => setCartOpen(true)}
      onLoginClick={() => navigate("/auth")}
      user={user}
    >
      {/* Order Status Section */}
      {tableData?.order && (
        <div className="mb-6">
          <OrderStatus order={tableData.order} />
        </div>
      )}
      
      {/* Category Navigation */}
      <div className="bg-gray-100 overflow-x-auto mb-6">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="starters" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
            >
              Starters
            </TabsTrigger>
            <TabsTrigger 
              value="main_course" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
            >
              Main Course
            </TabsTrigger>
            <TabsTrigger 
              value="desserts" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
            >
              Desserts
            </TabsTrigger>
            <TabsTrigger 
              value="beverages" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
            >
              Beverages
            </TabsTrigger>
            <TabsTrigger 
              value="specials" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
            >
              Specials
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <h2 className="text-xl font-poppins font-semibold text-gray-900 mb-4">Our Menu</h2>
      
      {/* Menu Items Grid */}
      {isMenuLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <Skeleton className="w-full h-48" />
              <div className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : menuItems && menuItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {menuItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              formatPrice={formatPrice}
              onAddToCart={() => addToCart(item)}
              disabled={!!tableData?.order || !item.available}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No menu items available in this category</p>
        </div>
      )}
      
      {/* Check if there's an active order already */}
      {!tableData?.order && cartItems.length > 0 && (
        <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-auto z-10">
          <Button 
            onClick={() => setCartOpen(true)}
            size="lg"
            className="w-full md:w-auto shadow-lg"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            View Cart ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)
          </Button>
        </div>
      )}
      
      {/* Cart Modal */}
      <CartModal
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        updateQuantity={updateCartItemQuantity}
        removeItem={removeFromCart}
        subtotal={subtotal}
        tax={tax}
        total={total}
        formatPrice={formatPrice}
        onPlaceOrder={() => {
          if (!user) {
            toast({
              title: "Authentication required",
              description: "Please log in to place an order",
              variant: "destructive",
            });
            navigate(`/auth?redirect=/table/${tableId}`);
            return;
          }
          placeOrderMutation.mutate();
        }}
        isPending={placeOrderMutation.isPending}
        hasActiveOrder={!!tableData?.order}
      />
      
      {/* Show login button if user is not logged in */}
      {!user && (
        <div className="fixed bottom-4 inset-x-4 md:left-auto md:right-4 md:w-auto z-10">
          <Button 
            onClick={() => navigate(`/auth?redirect=/table/${tableId}`)}
            variant="outline"
            size="lg"
            className="w-full md:w-auto shadow-lg bg-white"
          >
            <User className="mr-2 h-5 w-5" />
            Login to place an order
          </Button>
        </div>
      )}
    </CustomerLayout>
  );
}
