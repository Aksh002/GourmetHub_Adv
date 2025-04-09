import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/admin-layout";
import TableGrid from "@/components/admin/table-grid";
import OrderQueue from "@/components/admin/order-queue";
import TableDetailsModal from "@/components/admin/table-details-modal";
import { TableWithOrder, OrderWithItems } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [activeFloor, setActiveFloor] = useState(1);
  const [selectedTable, setSelectedTable] = useState<TableWithOrder | null>(null);
  
  // Fetch tables with orders
  const { 
    data: tablesWithOrders = [], 
    isLoading: isLoadingTables 
  } = useQuery<TableWithOrder[]>({
    queryKey: ["/api/tables/with-orders"],
    refetchInterval: 15000, // Refetch every 15 seconds
  });
  
  // Fetch orders
  const { 
    data: orders = [], 
    isLoading: isLoadingOrders 
  } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });
  
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
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Filter tables by floor
  const tablesForActiveFloor = tablesWithOrders.filter(
    table => table.floorNumber === activeFloor
  );
  
  // Filter orders by status
  const placedOrders = orders.filter(order => order.status === "placed");
  const preparingOrders = orders.filter(order => order.status === "under_process");
  const servedOrders = orders.filter(order => order.status === "served");
  const billingOrders = orders.filter(order => order.status === "completed");
  
  // For maximum floor number
  const maxFloor = tablesWithOrders.length > 0 
    ? Math.max(...tablesWithOrders.map(table => table.floorNumber), 1) 
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

  return (
    <AdminLayout>
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
                      {stats?.occupiedTables || 0}/{stats?.totalTables || 0}
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
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
              <h2 className="font-poppins font-semibold text-gray-900 mb-2 sm:mb-0">Floor Plan</h2>
              <TabsList>
                {floorTabs}
              </TabsList>
            </div>
            
            <div className="flex flex-wrap text-sm space-x-4 mb-4">
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
            
            {isLoadingTables ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square">
                    <Skeleton className="w-full h-full rounded-lg" />
                  </div>
                ))}
              </div>
            ) : tablesForActiveFloor.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <TableProperties className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tables on Floor {activeFloor}</h3>
                <p className="text-gray-500 mb-6">Add tables to this floor to manage orders</p>
                <Button onClick={() => window.location.href = "/admin/tables"}>
                  Go to Tables Management
                </Button>
              </div>
            ) : (
              <TableGrid 
                tables={tablesForActiveFloor} 
                onTableClick={(table) => setSelectedTable(table)} 
              />
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
            ) : placedOrders.length === 0 && 
               preparingOrders.length === 0 && 
               servedOrders.length === 0 && 
               billingOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Utensils className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No active orders</h3>
                <p className="text-gray-500">
                  Orders will appear here when customers place them
                </p>
              </div>
            ) : (
              <OrderQueue
                placedOrders={placedOrders}
                preparingOrders={preparingOrders}
                servedOrders={servedOrders}
                billingOrders={billingOrders}
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
      </div>
    </AdminLayout>
  );
}