import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RecoilRoot } from "recoil";
import AdminLayout from "@/components/layouts/admin-layout";
import DashboardTableGrid from "@/components/admin/dashboard/table-grid";
import OrderQueue from "@/components/admin/order-queue";
import TableDetailsModal from "@/components/admin/table-details-modal";
import { TableWithOrder, FloorPlanWithTables } from "@/types/table-types";
import { OrderWithItems } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  Utensils,
  Coffee,
  DollarSign,
  ArrowUpRight,
  TableProperties
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeFloor, setActiveFloor] = useState("1");
  const [selectedTable, setSelectedTable] = useState<TableWithOrder | null>(null);
  const [totalTablesCount, setTotalTablesCount] = useState(0);
  
  // Fetch restaurant details including floor plans and tables
  const { data: restaurantDetails, isLoading: isLoadingRestaurant } = useQuery<{
    floorPlans: FloorPlanWithTables[];
  }>({
    queryKey: ["restaurantDetails", user?.restaurantId],
    queryFn: async () => {
      if (!user?.restaurantId) {
        throw new Error("Restaurant ID not found");
      }
      const response = await fetch(`/api/restaurant/details`);
      if (!response.ok) {
        throw new Error("Failed to fetch restaurant details");
      }
      const data = await response.json();
      console.log("Restaurant details:", data);
      return data;
    },
    enabled: !!user?.restaurantId,
    refetchInterval: 30000,
  });

  // Calculate total tables when restaurant details are loaded
  useEffect(() => {
    if (restaurantDetails?.floorPlans) {
      console.log("Floor plans:", restaurantDetails.floorPlans);
      const total = restaurantDetails.floorPlans.reduce((sum: number, floorPlan: FloorPlanWithTables) => {
        // Count all tables, not just active ones
        const tableCount = floorPlan.tables?.length || 0;
        console.log(`Floor ${floorPlan.floorNumber} has ${tableCount} tables`);
        return sum + tableCount;
      }, 0);
      console.log("Total tables:", total);
      setTotalTablesCount(total);
    }
  }, [restaurantDetails]);

  // Fetch orders
  const { 
    data: rawOrders = [], 
    isLoading: isLoadingOrders 
  } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders", user?.restaurantId],
    queryFn: async () => {
      if (!user?.restaurantId) {
        throw new Error("Restaurant ID not found");
      }
      const response = await fetch(`/api/orders?restaurantId=${user.restaurantId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      return response.json();
    },
    enabled: !!user?.restaurantId,
    refetchInterval: 15000,
  });

  // Transform orders to match our type
  const orders = useMemo(() => {
    return rawOrders.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt)
    })) as OrderWithItems[];
  }, [rawOrders]);

  // Define stats interface
  interface StatsData {
    activeOrders: number;
    completedOrders: number;
    occupiedTables: number;
    totalTables: number;
    todaysRevenue: number;
  }
  
  // Fetch admin stats
  const { 
    data: stats, 
    isLoading: isLoadingStats 
  } = useQuery<StatsData>({
    queryKey: ["/api/admin/stats", user?.restaurantId],
    queryFn: async () => {
      if (!user?.restaurantId) {
        throw new Error("Restaurant ID not found");
      }
      const response = await fetch(`/api/admin/stats?restaurantId=${user.restaurantId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      return response.json();
    },
    enabled: !!user?.restaurantId,
    refetchInterval: 30000,
  });

  // Get current floor plan
  const currentFloorPlan = useMemo(() => {
    if (!restaurantDetails?.floorPlans) return null;
    console.log("Looking for floor plan:", activeFloor);
    const plan = restaurantDetails.floorPlans.find(
      (floorPlan) => floorPlan.floorNumber.toString() === activeFloor
    );
    console.log("Found floor plan:", plan);
    return plan;
  }, [restaurantDetails, activeFloor]);

  // Get tables for current floor with orders
  const currentFloorTables = useMemo(() => {
    if (!currentFloorPlan) return [];
    
    console.log("Processing tables for floor plan:", currentFloorPlan.floorNumber);
    return currentFloorPlan.tables.map(table => {
      // Find matching order for this table
      const matchingOrder = orders?.find(order => 
        order.tableId === table.id && 
        ['placed', 'under_process', 'served', 'completed'].includes(order.status)
      );

      // Create TableWithOrder object
      const tableWithOrder: TableWithOrder = {
        id: table.id,
        tableNumber: table.tableNumber,
        floorNumber: currentFloorPlan.floorNumber,
        qrCodeUrl: table.qrCodeUrl,
        restaurantId: table.restaurantId,
        status: table.status,
        config: table.config,
        position: {
          x: table.config.xPosition,
          y: table.config.yPosition,
          width: table.config.width,
          height: table.config.height
        },
        order: matchingOrder ? {
          id: matchingOrder.id,
          tableId: matchingOrder.tableId,
          restaurantId: matchingOrder.restaurantId,
          userId: matchingOrder.userId || undefined,
          status: matchingOrder.status,
          items: matchingOrder.items.map(item => ({
            id: item.id,
            orderId: item.orderId,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            status: "pending",
            menuItem: {
              id: item.menuItem.id,
              name: item.menuItem.name,
              description: item.menuItem.description,
              price: item.menuItem.price,
              available: item.menuItem.available,
              category: item.menuItem.category,
              imageUrl: item.menuItem.imageUrl || undefined,
              tags: item.menuItem.tags || undefined
            }
          })),
          createdAt: matchingOrder.createdAt.toISOString(),
          totalAmount: matchingOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        } : null
      };

      console.log("Processed table:", tableWithOrder);
      return tableWithOrder;
    });
  }, [currentFloorPlan, orders]);

  // Create floor tabs
  const floorTabs = useMemo(() => {
    if (!restaurantDetails?.floorPlans) return [];
    
    return restaurantDetails.floorPlans
      .sort((a, b) => a.floorNumber - b.floorNumber)
      .map(floorPlan => ({
        value: floorPlan.floorNumber.toString(),
        label: `Floor ${floorPlan.floorNumber}`,
        tables: floorPlan.tables.length
      }));
  }, [restaurantDetails]);

  // Set initial active floor
  useEffect(() => {
    if (restaurantDetails?.floorPlans && restaurantDetails.floorPlans.length > 0) {
      const lowestFloor = Math.min(...restaurantDetails.floorPlans.map(fp => fp.floorNumber));
      setActiveFloor(lowestFloor.toString());
    }
  }, [restaurantDetails]);

  return (
    <AdminLayout>
      <RecoilRoot>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-poppins font-bold text-gray-900">Restaurant Dashboard</h1>
            <p className="text-gray-600">Overview of restaurant operations</p>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {isLoadingStats ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-7 w-16 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Active Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold">{stats?.activeOrders || 0}</div>
                      <div className="p-2 bg-amber-100 rounded-full">
                        <Utensils className="h-4 w-4 text-amber-600" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Orders in various stages of preparation
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Table Occupancy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold">
                        {stats?.occupiedTables || 0}/{totalTablesCount || stats?.totalTables || 0}
                      </div>
                      <div className="p-2 bg-blue-100 rounded-full">
                        <TableProperties className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Currently occupied tables
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Today's Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold">{formatPrice(stats?.todaysRevenue || 0)}</div>
                      <div className="p-2 bg-green-100 rounded-full">
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Revenue from completed orders
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Completed Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold">{stats?.completedOrders || 0}</div>
                      <div className="p-2 bg-purple-100 rounded-full">
                        <Coffee className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Orders that have been completed today
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          
          {/* Floor Plan */}
          <div className="mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-poppins font-semibold text-gray-900">Floor Plan</h2>
                {restaurantDetails?.floorPlans && restaurantDetails.floorPlans.length > 0 && (
                  <Tabs value={activeFloor} onValueChange={setActiveFloor}>
                    <TabsList>
                      
                      {floorTabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                          {tab.label}
                        </TabsTrigger>
                      ))}
                     
                    </TabsList>
                  </Tabs>
                )}
              </div>

              {isLoadingRestaurant ? (
                <div className="w-full h-[400px] rounded-lg bg-gray-100 animate-pulse" />
              ) : !restaurantDetails?.floorPlans || restaurantDetails.floorPlans.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <TableProperties className="h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No floor plans configured</h3>
                  <p className="mt-1 text-sm text-gray-500">Add floor plans to manage tables and orders</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.location.href = '/admin/tables'}
                  >
                    Configure Floor Plans
                  </Button>
                </div>
              ) : currentFloorTables.length > 0 ? (
                <DashboardTableGrid
                  tables={currentFloorTables}
                  onTableClick={(table) => setSelectedTable(table)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <TableProperties className="h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No tables on Floor {activeFloor}</h3>
                  <p className="mt-1 text-sm text-gray-500">Add tables to manage orders and reservations</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.location.href = '/admin/tables'}
                  >
                    Add Tables
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Order Queue */}
          <div>
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-poppins font-semibold text-gray-900">Order Queue</h2>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = "/admin/orders"}
                  className="text-sm"
                >
                  View All Orders
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              
              {isLoadingOrders ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 border">
                      <Skeleton className="h-6 w-32 mb-4" />
                      <div className="space-y-3">
                        <Skeleton className="h-24 w-full rounded-lg" />
                        <Skeleton className="h-24 w-full rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Utensils className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active orders</h3>
                  <p className="text-gray-500">
                    Orders will appear here when customers place them
                  </p>
                </div>
              ) : (
                <OrderQueue
                  placedOrders={orders.filter(order => order.status === "placed")}
                  preparingOrders={orders.filter(order => order.status === "under_process")}
                  servedOrders={orders.filter(order => order.status === "served")}
                  billingOrders={orders.filter(order => order.status === "completed")}
                />
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
          
          {/* Restaurant ID Display */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Restaurant ID: <span className="font-mono text-gray-700">{user?.restaurantId || 'Not available'}</span>
              </p>
            </div>
          </div>
        </div>
      </RecoilRoot>
    </AdminLayout>
  );
}