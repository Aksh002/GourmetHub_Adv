import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CustomerLayout from "@/components/layouts/customer-layout";
import MenuItemCard from "@/components/customer/menu-item-card";
import CartModal from "@/components/customer/cart-modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MenuItem, CartItem } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function MenuPage() {
  const { restaurantId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Get table context from session storage
  const tableId = sessionStorage.getItem('currentTableId');

  // Log the restaurantId for debugging
  useEffect(() => {
    console.log('Restaurant ID:', restaurantId);
    console.log('Table ID:', tableId);
  }, [restaurantId, tableId]);

  // Fetch menu items
  const { data: menuItems, isLoading: isMenuLoading, error: menuError } = useQuery<MenuItem[]>({
    queryKey: ['menu', restaurantId],
    queryFn: async () => {
      console.log('Fetching menu items for restaurant:', restaurantId);
      const res = await apiRequest('GET', `/api/menu-items?restaurantId=${restaurantId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch menu items');
      }
      const data = await res.json();
      console.log('Fetched menu items:', data);
      return data;
    },
    enabled: !!restaurantId
  });

  // Format price function
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price / 100);
  };

  // Log any menu fetching errors
  useEffect(() => {
    if (menuError) {
      console.error('Menu fetching error:', menuError);
      toast({
        title: "Failed to load menu",
        description: menuError instanceof Error ? menuError.message : "Could not load menu items",
        variant: "destructive",
      });
    }
  }, [menuError, toast]);

  // Log menu items when they change
  useEffect(() => {
    console.log('Current menu items:', menuItems);
  }, [menuItems]);

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
        tableId: parseInt(tableId!),
        restaurantId: parseInt(restaurantId!),
        items: cartItems.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Order placed successfully!",
        description: "Your order has been sent to the kitchen.",
      });
      setCartItems([]);
      setCartOpen(false);
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
      const existingItemIndex = prevItems.findIndex(
        (cartItem) => cartItem.menuItemId === item.id
      );

      if (existingItemIndex >= 0) {
        const newItems = [...prevItems];
        newItems[existingItemIndex].quantity += 1;
        return newItems;
      } else {
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

  // Calculate cart totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  // If not logged in, redirect to auth page
  useEffect(() => {
    if (!user && !isMenuLoading) {
      toast({
        title: "Authentication required",
        description: "Please log in to place an order.",
      });
      navigate("/auth");
    }
  }, [user, isMenuLoading, navigate, toast]);

  // Group menu items by category
  const menuByCategory = menuItems?.reduce((acc: Record<string, MenuItem[]>, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <CustomerLayout 
      title="The Gourmet Hub"
      tableInfo={tableId ? `Table #${tableId}` : undefined}
      cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
      onCartClick={() => setCartOpen(true)}
      onLoginClick={() => navigate("/auth")}
      user={user}
    >
      {isMenuLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4 space-y-3">
              <Skeleton className="h-40 w-full rounded-md" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
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
                {menuByCategory && Object.keys(menuByCategory).map((category) => (
                  <TabsTrigger 
                    key={category} 
                    value={category}
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {menuItems && (selectedCategory === "all" 
              ? menuItems 
              : menuItems.filter(item => item.category === selectedCategory)
            ).map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                formatPrice={formatPrice}
                onAddToCart={() => addToCart(item)}
              />
            ))}
          </div>

          {/* Cart Modal */}
          <CartModal
            isOpen={cartOpen}
            onClose={() => setCartOpen(false)}
            cartItems={cartItems}
            updateQuantity={updateCartItemQuantity}
            removeItem={(id) => updateCartItemQuantity(id, 0)}
            subtotal={subtotal}
            tax={tax}
            total={total}
            formatPrice={formatPrice}
            onPlaceOrder={() => placeOrderMutation.mutate()}
            isPending={placeOrderMutation.isPending}
            hasActiveOrder={false}
          />
        </>
      )}
    </CustomerLayout>
  );
} 