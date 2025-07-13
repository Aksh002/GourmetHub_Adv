import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import AdminLayout from "@/components/layouts/admin-layout";
import { TableWithOrder, TableWithConfig, FloorPlanWithTables } from "@/types/table-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCode } from "@/components/ui/qr-code";
import { getTableStatusColor, getTableStatusText, getTableStatusTextColor } from "@/lib/utils";
import { 
  TableProperties,
  Plus,
  Settings,
  Edit, 
  Trash, 
  ChevronsUpDown,
  Search
} from "lucide-react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import TableDetailsModal from "@/components/admin/table-details-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";

// Form schema for creating/editing tables
const tableFormSchema = z.object({
  floorNumber: z.coerce.number().int().min(1, "Floor number must be at least 1"),
  tableNumber: z.coerce.number().int().min(1, "Table number must be at least 1"),
  qrCodeUrl: z.string().optional(),
});

type TableFormValues = z.infer<typeof tableFormSchema>;

export default function TablesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeFloor, setActiveFloor] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTable, setEditingTable] = useState<TableWithConfig | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableWithConfig | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<TableWithConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form setup
  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      floorNumber: 1,
      tableNumber: 1,
      qrCodeUrl: "",
    },
  });

  // Fetch all floor plans with tables
  const { data: floorPlans = [], isLoading } = useQuery<FloorPlanWithTables[]>({
    queryKey: ["/api/floor-plans/with-tables", { restaurantId: user?.restaurantId }],
    queryFn: async () => {
      if (!user?.restaurantId) {
        throw new Error("Restaurant ID not found");
      }
      const response = await apiRequest("GET", `/api/floor-plans/with-tables?restaurantId=${user.restaurantId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch floor plans');
      }
      const data = await response.json();
      console.log("Raw floor plans data:", data); // Debug log
      // Transform the data to match our frontend types
      const transformed = data.map((plan: any) => {
        console.log("Processing floor plan:", plan); // Debug log
        return {
          ...plan,
          tables: plan.tables.map((table: any) => {
            console.log("Processing table:", table); // Debug log
            return {
              ...table,
              position: {
                x: table.config.xPosition,
                y: table.config.yPosition,
                width: table.config.width,
                height: table.config.height
              }
            };
          })
        };
      });
      console.log("Transformed floor plans:", transformed); // Debug log
      return transformed;
    },
    enabled: !!user?.restaurantId,
  });

  // Create table mutation
  const createTable = useMutation({
    mutationFn: async (data: TableFormValues) => {
      if (!user?.restaurantId) {
        throw new Error("Restaurant ID not found");
      }
      
      // First create the table
      const tableResponse = await apiRequest("POST", "/api/tables", {
        ...data,
        restaurantId: user.restaurantId
      });
      
      if (!tableResponse.ok) {
        const error = await tableResponse.json();
        throw new Error(error.message || 'Failed to create table');
      }
      
      const table = await tableResponse.json();
      
      // Get the floor plan for this floor number
      const floorPlanResponse = await apiRequest("GET", `/api/floor-plans?restaurantId=${user.restaurantId}&floorNumber=${data.floorNumber}`);
      
      if (!floorPlanResponse.ok) {
        throw new Error('Failed to get floor plan');
      }
      
      const floorPlans = await floorPlanResponse.json();
      const floorPlan = floorPlans[0]; // Get the first floor plan for this floor
      
      if (!floorPlan) {
        throw new Error('Floor plan not found');
      }
      
      // Then create the table config
      const configResponse = await apiRequest("POST", "/api/table-configs", {
        tableId: table.id,
        floorPlanId: floorPlan.id,
        xPosition: 0,
        yPosition: 0,
        width: 100,
        height: 100,
        shape: "rectangle",
        seats: 4,
        isActive: true
      });
      
      if (!configResponse.ok) {
        const error = await configResponse.json();
        throw new Error(error.message || 'Failed to create table configuration');
      }
      
      return table;
    },
    onSuccess: () => {
      toast({
        title: "Table created",
        description: "The table has been created successfully.",
      });
      form.reset({
        floorNumber: activeFloor,
        tableNumber: 1,
        qrCodeUrl: "",
      });
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/floor-plans/with-tables"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create table",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete table functionality would go here in a real application
  // For our demo, we'll just show a toast since we don't have a delete endpoint
  const deleteTable = () => {
    if (tableToDelete) {
      toast({
        title: "Table deletion",
        description: "Table deletion would happen here in a production app.",
      });
      setDeleteDialogOpen(false);
      setTableToDelete(null);
    }
  };

  // Filter tables by floor and search query
  const filteredTables = floorPlans
    .find(plan => plan.floorNumber === activeFloor)
    ?.tables.filter(table => {
      const matchesSearch = searchQuery === "" || 
        `Table ${table.tableNumber}`.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }) || [];

  // For maximum floor number
  const maxFloor = floorPlans.length > 0 
    ? Math.max(...floorPlans.map(plan => plan.floorNumber))
    : 1;
  
  // Create floor tabs
  const floorTabs = [];
  for (let i = 1; i <= maxFloor; i++) {
    floorTabs.push(
      <TabsTrigger key={i} value={i.toString()}>
        Floor {i}
      </TabsTrigger>
    );
  }

  // Handle edit button click
  const handleEdit = (table: TableWithConfig) => {
    setIsEditMode(true);
    setEditingTable(table);
    form.reset({
      floorNumber: table.floorNumber,
      tableNumber: table.tableNumber,
      qrCodeUrl: table.qrCodeUrl,
    });
    setIsAddDialogOpen(true);
  };

  // Handle form submission
  const onSubmit = async (data: TableFormValues) => {
    if (isEditMode && editingTable) {
      try {
        const response = await apiRequest("PUT", `/api/tables/${editingTable.id}`, {
          ...data,
          restaurantId: user?.restaurantId
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to update table');
        }
        toast({
          title: "Success",
          description: "Table updated successfully",
        });
        setIsAddDialogOpen(false);
        setIsEditMode(false);
        setEditingTable(null);
        queryClient.invalidateQueries({ queryKey: ["/api/floor-plans/with-tables"] });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update table",
          variant: "destructive",
        });
      }
    } else {
      createTable.mutate(data);
    }
  };

  const handleGenerateQR = async (table: TableWithConfig) => {
    try {
      const qrCodeUrl = `/table/${table.floorId}/${table.tableNumber}`;
      const response = await apiRequest("POST", "/api/qr", {
        url: qrCodeUrl,
      });

      if (response) {
        // Handle QR code generation success
        toast({
          title: "Success",
          description: "QR code generated successfully",
        });
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  if (!user?.restaurantId) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Tables</h1>
          <p>Loading user information...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-poppins font-bold text-gray-900">Tables Management</h1>
            <p className="text-gray-600">Configure and manage restaurant tables</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                type="text" 
                placeholder="Search tables..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Table
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {isEditMode ? "Edit Table" : "Add New Table"}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditMode 
                      ? "Update the details of this table." 
                      : "Create a new table on the floor plan."}
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="floorNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Floor Number</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Which floor is this table located on?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tableNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Table Number</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            The table's displayed number
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="qrCodeUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>QR Code URL (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="QR Code URL (optional)"
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Leave empty to auto-generate
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={createTable.isPending}>
                        {createTable.isPending ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {isEditMode ? "Updating..." : "Creating..."}
                          </>
                        ) : (
                          isEditMode ? "Update Table" : "Create Table"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Floor Selection Tabs */}
        <Tabs 
          defaultValue="1" 
          value={activeFloor.toString()}
          onValueChange={(value) => setActiveFloor(parseInt(value))}
          className="mb-6"
        >
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-poppins font-semibold text-gray-900">Floor Plan</h2>
              <TabsList>
                {floorTabs}
              </TabsList>
            </div>
            
            <div className="flex flex-wrap text-sm space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-gray-400 mr-1"></div>
                <span>Vacant</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
                <span>Order Placed</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                <span>Under Process</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                <span>Served</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                <span>Awaiting Payment</span>
              </div>
            </div>
            
            {/* Table Grid */}
            <div className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-square">
                      <Skeleton className="w-full h-full rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <TableProperties className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tables on Floor {activeFloor}</h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery
                      ? "Try adjusting your search."
                      : "Create your first table on this floor."}
                  </p>
                  <Button onClick={() => {
                    form.reset({
                      floorNumber: activeFloor,
                      tableNumber: 1,
                      qrCodeUrl: "",
                    });
                    setIsAddDialogOpen(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Table to Floor {activeFloor}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredTables.map((table) => (
                    <div key={table.id} className="restaurant-table">
                      <div className="relative group">
                        <button
                          onClick={() => setSelectedTable(table)}
                          className={`w-full aspect-square rounded-lg border-2 ${getTableStatusColor(table.order)} flex flex-col items-center justify-center p-2 hover:bg-opacity-80 transition-colors`}
                        >
                          <TableProperties className={`mb-1 ${getTableStatusTextColor(table.order)}`} />
                          <span className="text-gray-900 font-medium">Table {table.tableNumber}</span>
                          <span className={`text-xs ${getTableStatusTextColor(table.order)}`}>
                            {getTableStatusText(table.order)}
                          </span>
                        </button>
                        
                        {/* Action buttons on hover */}
                        <div className="absolute top-2 right-2 hidden group-hover:flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-white shadow"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(table);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-white shadow text-red-500 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTableToDelete(table);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Tabs>
        
        {/* QR Code Section */}
        <div className="mb-6">
          <h2 className="font-poppins font-semibold text-gray-900 mb-4">Table QR Codes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <Skeleton className="h-48 w-48" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-9 w-full" />
                  </CardFooter>
                </Card>
              ))
            ) : filteredTables.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-10 text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No QR codes to display</h3>
                  <p className="text-gray-500">
                    Add tables to generate their QR codes for customers to scan.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredTables.slice(0, 6).map((table) => (
                <Card key={table.id}>
                  <CardHeader>
                    <CardTitle>Table {table.tableNumber}</CardTitle>
                    <CardDescription>Floor {table.floorNumber}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <QRCode
                      value={table.qrCodeUrl || `/table/${table.id}`}
                      size={150}
                      fgColor="#FF5722"
                    />
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" variant="outline">
                      Download QR Code
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
          
          {filteredTables.length > 6 && (
            <div className="mt-4 text-center">
              <Button variant="outline">
                View All QR Codes
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Table Details Modal */}
      {selectedTable && (
        <TableDetailsModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete Table {tableToDelete?.tableNumber} on Floor {tableToDelete?.floorNumber}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTable} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
