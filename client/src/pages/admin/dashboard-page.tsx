import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/admin-layout";
import TableGrid from "@/components/admin/table-grid";
import OrderQueue from "@/components/admin/order-queue";
import RecentOrdersTable from "@/components/admin/recent-orders-table";
import StatsCards from "@/components/admin/stats-cards";
import { useState } from "react";
import { TableWithOrder, OrderWithItems } from "@shared/schema";
import TableDetailsModal from "@/components/admin/table-details-modal";
import { Input } from "@/components/ui/input";
import { Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedTable, setSelectedTable] = useState<TableWithOrder | null>(null);
  
  // Fetch tables with orders for selected floor
  const { data: tables, isLoading: tablesLoading } = useQuery<TableWithOrder[]>({
    queryKey: ["/api/tables/with-orders"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch all orders
  const { data: orders, isLoading: ordersLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Filter tables by floor
  const tablesByFloor = tables?.filter(table => table.floorNumber === selectedFloor) || [];
  
  // Get orders by status
  const getOrdersByStatus = (status: string) => {
    return orders?.filter(order => order.status === status) || [];
  };

  const placedOrders = getOrdersByStatus("placed");
  const preparingOrders = getOrdersByStatus("under_process");
  const servedOrders = getOrdersByStatus("served");
  const billingOrders = getOrdersByStatus("completed");

  // Handle table selection for modal
  const handleTableClick = (table: TableWithOrder) => {
    setSelectedTable(table);
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-poppins font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Manage orders and restaurant operations</p>
          </div>
          <div className="mt-3 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                type="text" 
                placeholder="Search orders..." 
                className="pl-9 w-full"
              />
            </div>
            <Button variant="outline" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Today</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="h-4 w-4"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <StatsCards 
          stats={stats}
          isLoading={statsLoading}
        />
        
        {/* Floor Plan & Tables */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="font-poppins font-semibold text-gray-900">Floor Plan</h2>
              <div className="flex items-center">
                <Button 
                  variant={selectedFloor === 1 ? "default" : "outline"}
                  onClick={() => setSelectedFloor(1)}
                  className="rounded-l-lg rounded-r-none"
                >
                  Floor 1
                </Button>
                <Button 
                  variant={selectedFloor === 2 ? "default" : "outline"}
                  onClick={() => setSelectedFloor(2)}
                  className="rounded-l-none rounded-r-lg"
                >
                  Floor 2
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap mt-3 text-sm space-x-4 text-gray-700">
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
          </div>
          
          {tablesLoading ? (
            <div className="p-6 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square">
                  <Skeleton className="w-full h-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <TableGrid 
              tables={tablesByFloor}
              onTableClick={handleTableClick}
            />
          )}
        </div>
        
        {/* Order Queue */}
        <div className="mb-6">
          <h2 className="font-poppins font-semibold text-gray-900 mb-4">Order Queue</h2>
          {ordersLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-4">
                  <Skeleton className="h-8 w-32 mb-4" />
                  <div className="space-y-3">
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-32 w-full rounded-lg" />
                  </div>
                </div>
              ))}
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
        
        {/* Recent Orders */}
        <div>
          <h2 className="font-poppins font-semibold text-gray-900 mb-4">Recent Orders</h2>
          <RecentOrdersTable orders={orders || []} isLoading={ordersLoading} />
        </div>
      </div>
      
      {/* Table Details Modal */}
      {selectedTable && (
        <TableDetailsModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
        />
      )}
    </AdminLayout>
  );
}
