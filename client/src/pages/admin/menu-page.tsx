import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import AdminLayout from "@/components/layouts/admin-layout";
import { MenuItem, insertMenuItemSchema, menuItemCategories } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import {
  Pizza,
  Search,
  Plus,
  Edit,
  Trash,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Image,
  Coffee
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React from "react";

// Define menu item form schema based on the insert schema
const menuItemFormSchema = insertMenuItemSchema.extend({
  price: z.coerce.number().min(0, "Price must be at least 0"),
});

type MenuItemFormValues = z.infer<typeof menuItemFormSchema>;

// Helper function to capitalize first letter with null check
const capitalizeFirstLetter = (str: string | undefined | null) => {
  if (!str) return 'Other';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function MenuPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { user } = useAuth();

  // Setup form with validation
  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      category: menuItemCategories[0], // Set first actual category as default
      imageUrl: "",
      available: true,
    },
  });

  // Fetch menu items with better error handling
  const { data: menuItems = [], isLoading, error } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", { restaurantId: user?.restaurantId }],
    queryFn: async () => {
      if (!user?.restaurantId) {
        throw new Error("Restaurant ID not found");
      }
      const response = await apiRequest("GET", `/api/menu-items?restaurantId=${user.restaurantId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch menu items');
      }
      return await response.json() || [];
    },
    enabled: !!user?.restaurantId, // Only run query when we have a user with restaurantId
  });

  if (!user?.restaurantId) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Menu Items</h1>
          <p>Loading user information...</p>
        </div>
      </AdminLayout>
    );
  }

  // Group items by category including "all"
  const itemsByCategory = React.useMemo(() => {
    console.log("Grouping menu items:", menuItems);
    const grouped: Record<string, MenuItem[]> = {
      all: [] // Initialize "all" category
    };

    // First, add all items to the "all" category
    grouped.all = [...menuItems];

    // Then group items by their specific categories
    menuItems.forEach(item => {
      const category = (item.category || 'other').toLowerCase().replace(' ', '_');
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    // Ensure all predefined categories exist
    menuItemCategories.forEach(category => {
      if (!grouped[category]) {
        grouped[category] = [];
      }
    });

    console.log("Grouped items:", grouped);
    return grouped;
  }, [menuItems]);

  // Filter menu items by search query and category
  const filteredItems = React.useMemo(() => {
    console.log("Filtering items for category:", selectedCategory);
    if (!menuItems?.length) return [];
    
    return menuItems.filter((item) => {
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (selectedCategory === "all") {
        return matchesSearch;
      }
      
      const itemCategory = (item.category || 'other').toLowerCase().replace(' ', '_');
      return matchesSearch && itemCategory === selectedCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  // Create menu item mutation
  const createMenuItem = useMutation({
    mutationFn: async (data: MenuItemFormValues) => {
      const response = await apiRequest("POST", "/api/menu-items", {
        ...data,
        price: Number(data.price), // Ensure price is a number
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create menu item');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Menu item created",
        description: "The menu item has been created successfully.",
      });
      form.reset();
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create menu item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update menu item mutation
  const updateMenuItem = useMutation({
    mutationFn: async (data: { id: number; item: Partial<MenuItem> }) => {
      const response = await apiRequest("PUT", `/api/menu-items/${data.id}`, {
        ...data.item,
        price: Number(data.item.price), // Ensure price is a number
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update menu item');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Menu item updated",
        description: "The menu item has been updated successfully.",
      });
      setIsAddDialogOpen(false);
      setIsEditMode(false);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update menu item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete menu item mutation
  const deleteMenuItem = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/menu-items/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Menu item deleted",
        description: "The menu item has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete menu item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission with better error handling
  const onSubmit = async (data: MenuItemFormValues) => {
    try {
      if (isEditMode && editingItem) {
        await updateMenuItem.mutateAsync({
          id: editingItem.id,
          item: {
            ...data,
            price: Number(data.price),
          },
        });
      } else {
        await createMenuItem.mutateAsync({
          ...data,
          price: Number(data.price),
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      // Error is handled by the mutation callbacks
    }
  };

  // Handle edit button click
  const handleEdit = (item: MenuItem) => {
    setIsEditMode(true);
    setEditingItem(item);
    form.reset({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      imageUrl: item.imageUrl || "",
      available: item.available,
    });
    setIsAddDialogOpen(true);
  };

  // Handle delete button click
  const handleDelete = (item: MenuItem) => {
    // Check if this is the last item in its category
    const categoryItems = itemsByCategory[item.category.toLowerCase().replace(' ', '_')] || [];
    if (categoryItems.length <= 1) {
      toast({
        title: "Cannot delete item",
        description: "Each category must have at least one item. Edit the item instead.",
        variant: "destructive",
      });
      return;
    }
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  // Update item availability
  const toggleAvailability = (item: MenuItem) => {
    updateMenuItem.mutate({
      id: item.id,
      item: { available: !item.available },
    });
  };

  // Modify the category tabs section to remove "All" and show counts
  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-poppins font-bold text-gray-900">Menu Management</h1>
            <p className="text-gray-600">Manage your restaurant menu items</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                type="text" 
                placeholder="Search menu..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex space-x-1">
              <Button 
                variant={viewMode === "grid" ? "default" : "outline"} 
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-grid">
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="14" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
              </Button>
              <Button 
                variant={viewMode === "list" ? "default" : "outline"} 
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list">
                  <line x1="8" x2="21" y1="6" y2="6" />
                  <line x1="8" x2="21" y1="12" y2="12" />
                  <line x1="8" x2="21" y1="18" y2="18" />
                  <line x1="3" x2="3.01" y1="6" y2="6" />
                  <line x1="3" x2="3.01" y1="12" y2="12" />
                  <line x1="3" x2="3.01" y1="18" y2="18" />
                </svg>
              </Button>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {isEditMode ? "Edit Menu Item" : "Add New Menu Item"}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditMode 
                      ? "Update the details of this menu item." 
                      : "Add a new item to your restaurant menu."}
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Spaghetti Carbonara" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Briefly describe the dish..." 
                              className="resize-none"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                <Input 
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="pl-7"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {menuItemCategories.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL (Optional)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Image className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                              <Input 
                                {...field} 
                                className="pl-9" 
                                placeholder="https://example.com/image.jpg" 
                                value={field.value || ""}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Enter a URL for the menu item image
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="available"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Available for Ordering</FormLabel>
                            <FormDescription>
                              Mark this item as available on the menu
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          setIsEditMode(false);
                          setEditingItem(null);
                          form.reset({
                            name: "",
                            description: "",
                            price: 0,
                            category: menuItemCategories[0],
                            imageUrl: "",
                            available: true,
                          });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMenuItem.isPending || updateMenuItem.isPending}
                      >
                        {(createMenuItem.isPending || updateMenuItem.isPending) ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {isEditMode ? "Updating..." : "Creating..."}
                          </>
                        ) : (
                          isEditMode ? "Update Item" : "Create Item"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Category Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <Tabs 
            defaultValue="all"
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            className="w-full"
          >
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                <span className="flex items-center gap-2">
                  All
                  <Badge variant="secondary" className="ml-2">
                    {itemsByCategory["all"]?.length || 0}
                  </Badge>
                </span>
              </TabsTrigger>
              {menuItemCategories.filter(cat => cat !== "all").map((category) => (
                <TabsTrigger key={category} value={category} className="flex-1">
                  <span className="flex items-center gap-2">
                    {capitalizeFirstLetter(category)}
                    <Badge variant="secondary" className="ml-2">
                      {itemsByCategory[category]?.length || 0}
                    </Badge>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        {/* Show error state if fetch failed */}
        {error ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load menu items</h3>
            <p className="text-gray-500 mb-6">{error.message}</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] })}>
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <div className="h-48 bg-gray-100">
                    <Skeleton className="h-full w-full" />
                  </div>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-8 w-full rounded-md" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]"><Skeleton className="h-4 w-8" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-12 w-12 rounded-md" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : !menuItems.length ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Pizza className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items found</h3>
            <p className="text-gray-500 mb-6">
              Add your first menu item to get started.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Menu Item
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="overflow-hidden group">
                <div className="h-48 bg-gray-100 relative">
                  <img 
                    src={item.imageUrl || `https://source.unsplash.com/featured/?food,${(item.name || 'food').replace(/\s+/g, '')}`}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.currentTarget.src = 'https://source.unsplash.com/featured/?food';
                    }}
                  />
                  {!item.available && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <Badge variant="outline" className="bg-white text-red-500">
                        Unavailable
                      </Badge>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 bg-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleAvailability(item)}>
                          {item.available ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Mark as Unavailable
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as Available
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(item)} className="text-red-600">
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-medium">{item.name}</CardTitle>
                    <Badge className={`${item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium text-orange-600">{formatPrice(item.price)}</div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {capitalizeFirstLetter(item.category)}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleEdit(item)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Item
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="h-12 w-12 rounded-md bg-gray-100 overflow-hidden">
                        <img
                          src={item.imageUrl || `https://source.unsplash.com/featured/?food,${(item.name || 'food').replace(/\s+/g, '')}`}
                          alt={item.name || 'Menu Item'}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {capitalizeFirstLetter(item.category)}
                      </div>
                    </TableCell>
                    <TableCell>{formatPrice(item.price)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-gray-500 line-clamp-1">{item.description}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleAvailability(item)}>
                            {item.available ? (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Mark as Unavailable
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Available
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(item)} className="text-red-600">
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the menu item "{itemToDelete?.name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => itemToDelete && deleteMenuItem.mutate(itemToDelete.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMenuItem.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}