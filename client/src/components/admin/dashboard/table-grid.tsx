import { TableWithOrder } from "@/types/table-types";
import { cn } from "@/lib/utils";
import { Clock, Users, CheckCircle, DollarSign } from "lucide-react";

interface DashboardTableGridProps {
  tables: TableWithOrder[];
  onTableClick: (table: TableWithOrder) => void;
}

export default function DashboardTableGrid({ tables, onTableClick }: DashboardTableGridProps) {
  // Get table status styling based on order status
  const getTableStatusStyling = (table: TableWithOrder) => {
    if (table.order) {
      switch (table.order.status) {
        case 'placed':
          return {
            bg: 'bg-gradient-to-br from-amber-100/20 via-amber-500/20 to-amber-800/20 hover:from-amber-300/70 hover:via-amber-400/80 hover:to-amber-500/90',
            border: 'border-2 border-amber-500/90',
            shadow: 'shadow-2xl shadow-amber-500/60',
            glow: 'shadow-amber-500/50',
            icon: <Clock className="h-3 w-3 text-white drop-shadow-sm" />,
            label: 'New Order'
          };
        case 'under_process':
          return {
            bg: 'bg-gradient-to-br from-blue-100/20 via-blue-500/20 to-blue-800/20 hover:from-blue-300/70 hover:via-blue-400/80 hover:to-blue-500/90',
            border: 'border-2 border-blue-500/90',
            shadow: 'shadow-2xl shadow-blue-500/60',
            glow: 'shadow-blue-500/50',
            icon: <Users className="h-3 w-3 text-white drop-shadow-sm" />,
            label: 'Preparing'
          };
        case 'served':
          return {
            bg: 'bg-gradient-to-br from-green-100/20 via-green-500/20 to-green-800/20 hover:from-green-300/70 hover:via-green-400/80 hover:to-green-500/90',
            border: 'border-2 border-green-500/90',
            shadow: 'shadow-2xl shadow-green-500/60',
            glow: 'shadow-green-500/50',
            icon: <CheckCircle className="h-3 w-3 text-white drop-shadow-sm" />,
            label: 'Served'
          };
        case 'completed':
          return {
            bg: 'bg-gradient-to-br from-purple-100/20 via-purple-500/20 to-purple-800/20 hover:from-purple-300/70 hover:via-purple-400/80 hover:to-purple-500/90',
            border: 'border-2 border-purple-500/90',
            shadow: 'shadow-2xl shadow-purple-500/60',
            glow: 'shadow-purple-500/50',
            icon: <DollarSign className="h-3 w-3 text-white drop-shadow-sm" />,
            label: 'Billing'
          };
        default:
          return {
            bg: 'bg-gradient-to-br from-gray-100/20 via-gray-500/20 to-gray-800/20 hover:from-gray-300/70 hover:via-gray-400/80 hover:to-gray-500/90',
            border: 'border-2 border-gray-500/90',
            shadow: 'shadow-2xl shadow-gray-500/60',
            glow: 'shadow-gray-500/50',
            icon: null,
            label: 'Available'
          };
      }
    }
    
    // Fallback to table status
    switch (table.status) {
      case 'occupied':
        return {
          bg: 'bg-gradient-to-br from-red-100/20 via-red-500/20 to-red-800/20 hover:from-red-300/70 hover:via-red-400/80 hover:to-red-500/90',
          border: 'border-2 border-red-500/90',
          shadow: 'shadow-2xl shadow-red-500/60',
          glow: 'shadow-red-500/50',
          icon: <Users className="h-3 w-3 text-white drop-shadow-sm" />,
          label: 'Occupied'
        };
      case 'reserved':
        return {
          bg: 'bg-gradient-to-br from-yellow-100/20 via-yellow-500/20 to-yellow-800/20 hover:from-yellow-300/70 hover:via-yellow-400/80 hover:to-yellow-500/90',
          border: 'border-2 border-yellow-500/90',
          shadow: 'shadow-2xl shadow-yellow-500/60',
          glow: 'shadow-yellow-500/50',
          icon: <Clock className="h-3 w-3 text-white drop-shadow-sm" />,
          label: 'Reserved'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-emerald-100/20 via-emerald-500/20 to-emerald-800/20 hover:from-emerald-300/70 hover:via-emerald-400/80 hover:to-emerald-500/90',
          border: 'border-2 border-emerald-500/90',
          shadow: 'shadow-2xl shadow-emerald-500/60',
          glow: 'shadow-emerald-500/50',
          icon: null,
          label: 'Available'
        };
    }
  };

  // Calculate grid dimensions based on table positions
  const gridBounds = tables.reduce(
    (bounds, table) => {
      if (table.position) {
        return {
          maxX: Math.max(bounds.maxX, table.position.x + table.position.width),
          maxY: Math.max(bounds.maxY, table.position.y + table.position.height),
        };
      }
      return bounds;
    },
    { maxX: 15, maxY: 10 } // Larger grid for better spacing
  );

  // Calculate aspect ratio to maintain proportions
  const aspectRatio = (gridBounds.maxY / gridBounds.maxX) * 100;

  return (
    <div className="w-full">
      {/* Container with fixed aspect ratio */}
      <div 
        className="relative w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700"
        style={{ paddingBottom: `${Math.min(aspectRatio, 60)}%` }} // Cap at 60% to prevent too tall
      >
        {/* Grid background */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        
        {/* Tables */}
        {tables.map((table) => {
          if (!table.position) return null;
          
          const styling = getTableStatusStyling(table);
          
          // Convert grid positions to percentages with proper centering
          const padding = 4; // Reduced padding
          const style = {
            left: `${(table.position.x / gridBounds.maxX) * (100 - padding) + padding/2}%`,
            top: `${(table.position.y / gridBounds.maxY) * (100 - padding) + padding/2}%`,
            width: `${(table.position.width / gridBounds.maxX) * (100 - padding)}%`,
            height: `${(table.position.height / gridBounds.maxY) * (100 - padding)}%`,
          };

          return (
            <div
              key={table.id}
              className={cn(
                "absolute rounded-xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-110 hover:-translate-y-1",
                "backdrop-blur-md bg-white/20 border-white/30",
                "hover:shadow-2xl hover:shadow-white/20 hover:bg-white/30",
                styling.bg,
                styling.border,
                styling.shadow
              )}
              style={{
                ...style,
                boxShadow: `0 8px 32px ${styling.glow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                backdropFilter: 'blur(12px)',
              }}
              onClick={() => onTableClick(table)}
            >
              {/* Table content */}
              <div className="h-full flex flex-col items-center justify-center p-1.5 text-white relative z-10">
                {/* Table number */}
                <div className="font-bold text-xs sm:text-sm lg:text-base drop-shadow-lg">
                  {table.tableNumber}
                </div>
                
                {/* Status indicator */}
                {styling.icon && (
                  <div className="mt-0.5 flex items-center justify-center">
                    {styling.icon}
                  </div>
                )}
                
                {/* Status text for larger tables */}
                {table.position && table.position.width > 1.5 && table.position.height > 1.5 && (
                  <div className="text-xs opacity-90 mt-0.5 text-center hidden sm:block font-medium drop-shadow-sm">
                    {styling.label}
                  </div>
                )}
              </div>
              
              {/* Order indicator dot */}
              {table.order && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-br from-red-400 to-red-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-20">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
          <span>New Order</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
          <span>Preparing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
          <span>Served</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
          <span>Billing</span>
        </div>
      </div>
    </div>
  );
}
