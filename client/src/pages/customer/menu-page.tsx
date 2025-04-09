import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CustomerLayout from "@/components/layouts/customer-layout";
import MenuItemCard from "@/components/customer/menu-item-card";
import CartModal from "@/components/customer/cart-modal";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/utils";
import { 
  CartItem, 
  MenuItem, 
  Table, 
  menuItemCategories,
  OrderWithItems
} from "@shared/schema";

export default function CustomerMenuPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const tableId = parseInt(params.get("table") || "0");
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Get menu items
  const { 
    data: menuItems = [], 
    isLoading: isMenuLoading, 
    isError: isMenuError 
  } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
    queryFn: () => fetch("/api/menu-items").then(res => res.json()),
  });
  
  // Get active table if any
  const {
    data: table,
    isLoading: isTableLoading
  } = useQuery<Table>({
    queryKey: ["/api/tables", tableId],
    queryFn: () => fetch(`/api/tables/${tableId}`).then(res => res.json()),
    enabled: !!tableId
  });
  
  // Check for active order
  const {
    data: activeOrder,
    isLoading: isOrderLoading
  } = useQuery<OrderWithItems>({
    queryKey: ["/api/tables", tableId, "active-order"],
    queryFn: () => fetch(`/api/tables/${tableId}/active-order`).then(res => {
      if (res.status === 404) {
        return null;
      }
      return res.json();
    }),
    enabled: !!tableId
  });

  // Place order mutation
  const orderMutation = useMutation({
    mutationFn: async (items: CartItem[]) => {
      const response = await apiRequest("POST", "/api/orders", {
        tableId,
        items: items.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        status: "placed"
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Order placed successfully",
        description: "Your order has been sent to the kitchen",
      });
      setCartItems([]);
      setIsCartOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/tables", tableId, "active-order"] });
      setLocation(`/customer/order/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to place order",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle active order redirect
  useEffect(() => {
    if (activeOrder) {
      setLocation(`/customer/order/${activeOrder.id}`);
    }
  }, [activeOrder, setLocation]);
  
  // Filter menu items by category and search
  const filteredMenuItems = menuItems.filter(item => {
    // Filter by category
    if (activeCategory !== "all" && item.category !== activeCategory) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    return true;
  });
  
  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCartItems(prev => {
      const existingItem = prev.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        return prev.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 } 
            : cartItem
        );
      } else {
        return [...prev, { 
          id: item.id, 
          name: item.name, 
          price: item.price, 
          quantity: 1 
        }];
      }
    });
    
    toast({
      title: "Added to order",
      description: `${item.name} has been added to your order`,
    });
  };
  
  const updateCartItemQuantity = (id: number, quantity: number) => {
    setCartItems(prev => 
      prev.map(item => item.id === id ? { ...item, quantity } : item)
    );
  };
  
  const removeCartItem = (id: number) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };
  
  // Calculate cart totals
  const cartSubtotal = cartItems.reduce(
    (total, item) => total + (item.price * item.quantity), 
    0
  );
  const cartTax = Math.round(cartSubtotal * 0.08);
  const cartTotal = cartSubtotal + cartTax;
  
  // Handle place order
  const handlePlaceOrder = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty order",
        description: "Please add items to your order",
        variant: "destructive",
      });
      return;
    }
    
    orderMutation.mutate(cartItems);
  };
  
  const isLoading = isMenuLoading || isTableLoading || isOrderLoading;
  
  // Redirect to auth page if not logged in
  if (!user) {
    setLocation(`/auth?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    return null;
  }
  
  return (
    <CustomerLayout
      title="Menu"
      tableInfo={table ? `Table #${table.tableNumber}` : undefined}
      cartItemCount={cartItems.length}
      onCartClick={() => setIsCartOpen(true)}
      user={user}
    >
      <div className="container py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-space text-gradient mb-2">
            Digital Menu
          </h1>
          <p className="text-muted-foreground">
            Browse our menu and place your order directly from your table
          </p>
        </div>
        
        {/* Search bar */}
        <div className="relative mb-6">
          <Input
            className="py-6 pl-10 bg-background/20 backdrop-blur-md border-border/30 placeholder:text-muted-foreground/50"
            placeholder="Search menu items, ingredients, or dietary preferences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading menu items...</p>
          </div>
        ) : isMenuError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load menu items. Please try again.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs
            defaultValue="all"
            value={activeCategory}
            onValueChange={setActiveCategory}
            className="space-y-6"
          >
            <TabsList className="bg-background/20 backdrop-blur-md border border-border/30 p-1 overflow-x-auto flex w-full max-w-full justify-start tabs-scrollbar">
              <TabsTrigger
                value="all"
                className="rounded-md py-2 px-4"
              >
                All
              </TabsTrigger>
              
              {menuItemCategories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="rounded-md py-2 px-4 whitespace-nowrap"
                >
                  {category.replace('_', ' ')}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div>
              {searchQuery && (
                <div className="mb-4 text-sm text-muted-foreground">
                  {filteredMenuItems.length === 0 ? (
                    <span>No results found for "{searchQuery}"</span>
                  ) : (
                    <span>Found {filteredMenuItems.length} results for "{searchQuery}"</span>
                  )}
                </div>
              )}
              
              {filteredMenuItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🍽️</div>
                  <h3 className="text-xl font-semibold mb-2">No items found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? "Try a different search query" 
                      : "No menu items available in this category"}
                  </p>
                  {searchQuery && (
                    <Button 
                      variant="outline" 
                      onClick={() => setSearchQuery("")}
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredMenuItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      formatPrice={formatPrice}
                      onAddToCart={addToCart}
                      disabled={orderMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          </Tabs>
        )}
      </div>
      
      {/* Cart modal */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        updateQuantity={updateCartItemQuantity}
        removeItem={removeCartItem}
        subtotal={cartSubtotal}
        tax={cartTax}
        total={cartTotal}
        formatPrice={formatPrice}
        onPlaceOrder={handlePlaceOrder}
        isPending={orderMutation.isPending}
        hasActiveOrder={!!activeOrder}
      />
    </CustomerLayout>
  );
}