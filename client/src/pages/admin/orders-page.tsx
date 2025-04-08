import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layouts/admin-layout";
import { OrderWithItems } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, formatTimeAgo, getOrderStatusText } from "@/lib/utils";
import {
  ClipboardList,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  MoreHorizontal,
  ArrowRight,
  CheckCircle2
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function OrdersPage() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isKanbanView, setIsKanbanView] = useState(true);
  const itemsPerPage = 10;

  // Fetch orders
  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Update order status mutation
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/orders/${orderId}/status`,
        { status }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables/with-orders"] });
      toast({
        title: "Order updated",
        description: "The order status has been updated successfully.",
      });
      
      // Close the details dialog if it's open
      if (isDetailsOpen) {
        setIsDetailsOpen(false);
      }
    },
    onError: (error) => {
      toast({
        title: "Error updating order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter and sort orders
  const filteredOrders = orders
    ? orders.filter(order => {
        // Status filter
        const statusMatch = !selectedStatus || order.status === selectedStatus;
        
        // Search filter (by order ID or table number)
        const searchMatch = !searchQuery || 
          order.id.toString().includes(searchQuery) || 
          `Table ${order.tableId}`.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Date filter
        let dateMatch = true;
        const orderDate = new Date(order.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dateFilter === "today") {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          dateMatch = orderDate >= today && orderDate < tomorrow;
        } else if (dateFilter === "yesterday") {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dateMatch = orderDate >= yesterday && orderDate < today;
        } else if (dateFilter === "this-week") {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          dateMatch = orderDate >= startOfWeek;
        }
        
        return statusMatch && searchMatch && dateMatch;
      })
    : [];

  // Sort by created date, newest first
  const sortedOrders = [...(filteredOrders || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Get orders by status for Kanban view
  const getOrdersByStatus = (status: string) => {
    return sortedOrders.filter(order => order.status === status);
  };

  const placedOrders = getOrdersByStatus("placed");
  const preparingOrders = getOrdersByStatus("under_process");
  const servedOrders = getOrdersByStatus("served");
  const completedOrders = getOrdersByStatus("completed");
  const paidOrders = getOrdersByStatus("paid");

  // Calculate pagination
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const paginatedOrders = sortedOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle next status update
  const handleNextStatus = (order: OrderWithItems) => {
    const statusFlow = {
      placed: "under_process",
      under_process: "served",
      served: "completed",
      completed: "paid",
    };
    
    const nextStatus = statusFlow[order.status as keyof typeof statusFlow];
    
    if (nextStatus) {
      updateOrderStatus.mutate({ orderId: order.id, status: nextStatus });
    }
  };

  // Get order total
  const getOrderTotal = (order: OrderWithItems) => {
    return order.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'placed':
        return <Badge className="bg-amber-500 hover:bg-amber-600">{getOrderStatusText(status)}</Badge>;
      case 'under_process':
        return <Badge className="bg-blue-500 hover:bg-blue-600">{getOrderStatusText(status)}</Badge>;
      case 'served':
        return <Badge className="bg-green-500 hover:bg-green-600">{getOrderStatusText(status)}</Badge>;
      case 'completed':
        return <Badge className="bg-red-500 hover:bg-red-600">{getOrderStatusText(status)}</Badge>;
      case 'paid':
        return <Badge variant="outline" className="text-gray-500">{getOrderStatusText(status)}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get next action button text
  const getNextActionText = (status: string) => {
    switch (status) {
      case 'placed':
        return "Start Preparing";
      case 'under_process':
        return "Mark as Served";
      case 'served':
        return "Complete & Generate Bill";
      case 'completed':
        return "Mark as Paid";
      default:
        return "";
    }
  };

  // Render order card for Kanban view
  const renderOrderCard = (order: OrderWithItems) => {
    return (
      <Card key={order.id} className="mb-3">
        <CardContent className="p-3">
          <div className="flex justify-between">
            <span className="font-medium">Table {order.tableId}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
              {formatTimeAgo(order.createdAt)}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">Order #{order.id}</div>
          <div className="flex justify-between mt-2 text-sm">
            <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
            <span className="font-medium">{formatPrice(getOrderTotal(order))}</span>
          </div>
          <div className="mt-2 max-h-24 overflow-y-auto">
            <ul className="text-xs text-gray-600">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between py-1">
                  <span>{item.quantity}x {item.menuItem.name}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>
          {order.status !== "paid" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => handleNextStatus(order)}
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              {getNextActionText(order.status)}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-poppins font-bold text-gray-900">Orders Management</h1>
            <p className="text-gray-600">View and manage all restaurant orders</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                type="text" 
                placeholder="Search orders..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex space-x-1">
              <Button 
                variant={isKanbanView ? "default" : "outline"} 
                size="icon"
                onClick={() => setIsKanbanView(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-dashboard">
                  <rect width="7" height="9" x="3" y="3" rx="1" />
                  <rect width="7" height="5" x="14" y="3" rx="1" />
                  <rect width="7" height="9" x="14" y="12" rx="1" />
                  <rect width="7" height="5" x="3" y="16" rx="1" />
                </svg>
              </Button>
              <Button 
                variant={!isKanbanView ? "default" : "outline"} 
                size="icon"
                onClick={() => setIsKanbanView(false)}
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
          </div>
        </div>
        
        {/* Status Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <Tabs 
            defaultValue="all" 
            value={selectedStatus || "all"}
            onValueChange={(value) => setSelectedStatus(value === "all" ? "" : value)}
            className="w-full"
          >
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All Orders
              </TabsTrigger>
              <TabsTrigger value="placed" className="flex-1">
                Placed
              </TabsTrigger>
              <TabsTrigger value="under_process" className="flex-1">
                Preparing
              </TabsTrigger>
              <TabsTrigger value="served" className="flex-1">
                Served
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex-1">
                Billed
              </TabsTrigger>
              <TabsTrigger value="paid" className="flex-1">
                Paid
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {isLoading ? (
          isKanbanView ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
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
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4">
                <Skeleton className="h-6 w-36 mb-4" />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )
        ) : sortedOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || selectedStatus || dateFilter !== "all"
                ? "Try adjusting your filters to see more orders."
                : "There are no orders to display."}
            </p>
          </div>
        ) : (
          <>
            {isKanbanView ? (
              // Kanban Board View
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Placed Orders Column */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-900">Placed ({placedOrders.length})</h3>
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {placedOrders.length > 0 ? (
                      placedOrders.map(renderOrderCard)
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No new orders
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Preparing Orders Column */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-900">Preparing ({preparingOrders.length})</h3>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
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
                        className="text-blue-600"
                      >
                        <path d="M12 19c0-4.2-2.8-7.5-6-7.5" />
                        <path d="M18 19c0-8.4-5.6-15-12.5-15" />
                        <path d="M12 19V4" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {preparingOrders.length > 0 ? (
                      preparingOrders.map(renderOrderCard)
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No orders being prepared
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Served Orders Column */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-900">Served ({servedOrders.length})</h3>
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
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
                        className="text-green-600"
                      >
                        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                        <path d="M7 2v20" />
                        <path d="M21 15c0 1.1-.9 2-2 2H3" />
                        <path d="m12 15 4-4" />
                        <path d="m12 15 4 4" />
                        <path d="M19 7V2" />
                        <path d="M15 2h8v5h-8V2Z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {servedOrders.length > 0 ? (
                      servedOrders.map(renderOrderCard)
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No served orders
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Completed Orders Column */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-900">Billed ({completedOrders.length})</h3>
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
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
                        className="text-red-600"
                      >
                        <path d="M2 3h20" />
                        <path d="M17 3v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3" />
                        <path d="m9 13 2 2 4-4" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {completedOrders.length > 0 ? (
                      completedOrders.map(renderOrderCard)
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No bills awaiting payment
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Paid Orders Column */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-900">Paid ({paidOrders.length})</h3>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {paidOrders.length > 0 ? (
                      paidOrders.map(order => (
                        <Card key={order.id} className="mb-3">
                          <CardContent className="p-3">
                            <div className="flex justify-between">
                              <span className="font-medium">Table {order.tableId}</span>
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                {formatTimeAgo(order.createdAt)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">Order #{order.id}</div>
                            <div className="flex justify-between mt-2 text-sm">
                              <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                              <span className="font-medium">{formatPrice(getOrderTotal(order))}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No paid orders
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Table View
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Order ID</TableHead>
                        <TableHead className="font-semibold">Table</TableHead>
                        <TableHead className="font-semibold">Items</TableHead>
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Time</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>Table {order.tableId}</TableCell>
                          <TableCell>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</TableCell>
                          <TableCell className="font-medium">{formatPrice(getOrderTotal(order))}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-gray-500">{formatTimeAgo(order.createdAt)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0"
                                >
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedOrder(order);
                                  setIsDetailsOpen(true);
                                }}>
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {order.status !== "paid" && (
                                  <DropdownMenuItem onClick={() => handleNextStatus(order)}>
                                    {getNextActionText(order.status)}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  Print receipt
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="py-4 px-6 border-t flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, sortedOrders.length)} of {sortedOrders.length} orders
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Order Details Dialog */}
      {selectedOrder && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order #{selectedOrder.id} Details</DialogTitle>
              <DialogDescription>
                Table {selectedOrder.tableId} • {formatTimeAgo(selectedOrder.createdAt)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-between items-center">
              <span className="font-medium">Status</span>
              {getStatusBadge(selectedOrder.status)}
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.menuItem.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatPrice(item.price)}</TableCell>
                      <TableCell className="text-right">{formatPrice(item.price * item.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Subtotal</span>
                <span>{formatPrice(getOrderTotal(selectedOrder))}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Tax (10%)</span>
                <span>{formatPrice(Math.round(getOrderTotal(selectedOrder) * 0.1))}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Service Charge (5%)</span>
                <span>{formatPrice(Math.round(getOrderTotal(selectedOrder) * 0.05))}</span>
              </div>
              <div className="flex justify-between font-medium text-primary pt-3 mt-3 border-t border-gray-200">
                <span>Total</span>
                <span>{formatPrice(
                  getOrderTotal(selectedOrder) + 
                  Math.round(getOrderTotal(selectedOrder) * 0.1) + 
                  Math.round(getOrderTotal(selectedOrder) * 0.05)
                )}</span>
              </div>
            </div>
            
            <DialogFooter className="gap-2">
              {selectedOrder.status !== "paid" && (
                <Button 
                  onClick={() => handleNextStatus(selectedOrder)}
                  className="flex-1"
                >
                  {getNextActionText(selectedOrder.status)}
                </Button>
              )}
              <Button variant="outline" className="flex-1">
                Print Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
