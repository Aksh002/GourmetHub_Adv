import { useState, useCallback } from "react";
import { TableWithOrder, TableConfig } from "@/types/table-types";
import { getTableStatusColor, getTableStatusText, getTableStatusTextColor } from "@/lib/utils";
import { TableProperties, Clock, Users, AlertCircle, Settings } from "lucide-react";
import { useRecoilState } from "recoil";
import { selectedTableState } from "@/store/tableState";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocation } from "wouter";

interface TableGridProps {
  tables: TableWithOrder[];
  onTableClick?: (table: TableWithOrder) => void;
}

export default function TableGrid({ tables, onTableClick }: TableGridProps) {
  const [selectedTable, setSelectedTable] = useRecoilState<TableWithOrder | null>(selectedTableState);
  const [clickCount, setClickCount] = useState<Record<string, number>>({});
  const [clickTimer, setClickTimer] = useState<Record<string, NodeJS.Timeout>>({});
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Grid layout configuration
  const CELL_SIZE = 50; // Base cell size for grid units
  const GRID_GAP = 20; // Gap between cells
  const CONTAINER_PADDING = 32;
  const MIN_HEIGHT = 400;
  const MIN_WIDTH = 800;

  // Calculate floor dimensions based on table positions
  const floorDimensions = tables.reduce((acc, table) => {
    if (!table.config) return acc;
    return {
      width: Math.max(acc.width, table.config.xPosition + table.config.width),
      height: Math.max(acc.height, table.config.yPosition + table.config.height)
    };
  }, { width: 0, height: 0 });

  // Calculate container dimensions
  const containerWidth = Math.max(MIN_WIDTH, (floorDimensions.width * CELL_SIZE) + (2 * CONTAINER_PADDING));
  const containerHeight = Math.max(MIN_HEIGHT, (floorDimensions.height * CELL_SIZE) + (2 * CONTAINER_PADDING));

  // Calculate position for each table based on its config
  const calculateTablePosition = (table: TableWithOrder) => {
    if (!table.config) return { x: 0, y: 0, width: 1, height: 1 };
    
    return {
      x: CONTAINER_PADDING + (table.config.xPosition * CELL_SIZE),
      y: CONTAINER_PADDING + (table.config.yPosition * CELL_SIZE),
      width: table.config.width * CELL_SIZE,
      height: table.config.height * CELL_SIZE
    };
  };

  // Handle table click
  const handleTableClick = useCallback(
    (table: TableWithOrder) => {
      setSelectedTable(table);
      onTableClick?.(table);
    },
    [onTableClick]
  );

  // Handle table reservation
  const handleReserveTable = async (table: TableWithOrder) => {
    try {
      const res = await apiRequest("POST", `/api/tables/${table.id}/reserve`, {
        reservationTime: new Date().toISOString(),
      });
      
      if (res.ok) {
        toast({
          title: "Table Status Updated",
          description: "The table's reservation status has been updated",
        });
      }
    } catch (error) {
      console.error("Failed to update table reservation:", error);
      toast({
        title: "Error",
        description: "Failed to update table status",
        variant: "destructive",
      });
    }
  };

  // Handle order state change
  const handleOrderStateChange = async (table: TableWithOrder) => {
    if (!table.order) return;
    
    const nextState = {
      placed: "under_process",
      under_process: "served",
      served: "completed",
      completed: "paid",
      paid: "paid"
    }[table.order.status] as "under_process" | "served" | "completed" | "paid";
    
    if (!nextState) return;
    
    try {
      const res = await apiRequest("PUT", `/api/orders/${table.order.id}`, {
        status: nextState,
      });
      
      if (res.ok) {
        toast({
          title: "Order Updated",
          description: `Order moved to ${nextState.replace("_", " ")} state`,
        });
      }
    } catch (error) {
      console.error("Failed to update order state:", error);
      toast({
        title: "Error",
        description: "Failed to update order state",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div 
        className="relative w-full rounded-3xl bg-gradient-to-br from-gray-950 to-gray-900 overflow-hidden"
        style={{ 
          width: `${containerWidth}px`,
          height: `${containerHeight}px`,
          minHeight: `${MIN_HEIGHT}px`
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        
        <div className="absolute inset-0">
          {tables.map((table) => {
            const getStatusStyles = () => {
              if (table.order?.status === "placed") return "from-amber-500/20 to-amber-600/20 border-amber-500/50 shadow-amber-500/20";
              if (table.order?.status === "under_process") return "from-blue-500/20 to-blue-600/20 border-blue-500/50 shadow-blue-500/20";
              if (table.order?.status === "served") return "from-green-500/20 to-green-600/20 border-green-500/50 shadow-green-500/20";
              if (table.order?.status === "completed") return "from-purple-500/20 to-purple-600/20 border-purple-500/50 shadow-purple-500/20";
              return "from-gray-500/20 to-gray-600/20 border-gray-500/50";
            };

            const getStatusColor = () => {
              if (table.order?.status === "placed") return "text-amber-400";
              if (table.order?.status === "under_process") return "text-blue-400";
              if (table.order?.status === "served") return "text-green-400";
              if (table.order?.status === "completed") return "text-purple-400";
              return "text-gray-400";
            };

            const position = calculateTablePosition(table);

            return (
              <TooltipProvider key={table.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`absolute cursor-pointer ${
                        selectedTable?.id === table.id ? "ring-2 ring-primary" : ""
                      }`}
                      style={{
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        width: `${position.width}px`,
                        height: `${position.height}px`
                      }}
                      onClick={() => handleTableClick(table)}
                    >
                      <div
                        className={`w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-blue-500/50 shadow-lg backdrop-blur-sm transform transition-all duration-200 hover:scale-105 flex flex-col items-center justify-center gap-2 ${getStatusStyles()} shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]`}
                      >
                        <div className="text-lg font-semibold text-gray-100">
                          Table {table.tableNumber}
                        </div>
                        <div className={`text-base font-medium px-3 py-1 rounded-full bg-black/30 ${getStatusColor()}`}>
                          {getTableStatusText(table.order)}
                        </div>

                        {/* Additional table info */}
                        {table.config && (
                          <div className="text-sm text-gray-400">
                            {table.config.seats} seats • {table.config.shape}
                          </div>
                        )}

                        {/* Status Indicators */}
                        <div className="absolute top-2 right-2 flex space-x-1">
                          {table.order?.status === "placed" && (
                            <Clock className="h-4 w-4 text-amber-400" />
                          )}
                          {table.order?.status === "under_process" && (
                            <AlertCircle className="h-4 w-4 text-blue-400" />
                          )}
                          {table.order?.status === "served" && (
                            <Users className="h-4 w-4 text-green-400" />
                          )}
                          {table.order?.status === "completed" && (
                            <TableProperties className="h-4 w-4 text-purple-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <div className="font-semibold">Table {table.tableNumber}</div>
                      <div className="text-sm text-gray-400">
                        {table.config?.seats} seats • {table.config?.shape}
                      </div>
                      <div className="text-sm text-gray-400">
                        Status: {getTableStatusText(table.order)}
                      </div>
                      {table.order && (
                        <div className="text-sm text-gray-400">
                          Order Total: {formatPrice(table.order.totalAmount)}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>

      {/* Manage Tables Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => setLocation("/admin/tables")}
        >
          <Settings className="h-4 w-4" />
          Manage Tables
        </Button>
      </div>
    </div>
  );
}