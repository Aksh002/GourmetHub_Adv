import { cn } from "@/lib/utils";

interface TableStatus {
  status: 'free' | 'occupied' | 'reserved';
  tableNumber: number;
}

const TableCard = ({ table, status }: { table: any, status: TableStatus }) => {
  const getStatusStyles = () => {
    switch (status.status) {
      case 'occupied':
        return 'from-blue-500/20 to-blue-600/20 border-blue-500/50 shadow-blue-500/20';
      case 'reserved':
        return 'from-amber-500/20 to-amber-600/20 border-amber-500/50 shadow-amber-500/20';
      case 'free':
        return 'from-green-500/20 to-green-600/20 border-green-500/50 shadow-green-500/20';
      default:
        return 'from-gray-500/20 to-gray-600/20 border-gray-500/50';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'occupied':
        return 'text-blue-400';
      case 'reserved':
        return 'text-amber-400';
      case 'free':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div
      className={cn(
        "absolute w-[120px] h-[120px] rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-gray-900/90 to-gray-800/90",
        "border-2",
        "shadow-lg shadow-[rgba(0,0,0,0.2)]",
        "backdrop-blur-sm",
        "transform transition-all duration-200 hover:scale-105",
        "flex flex-col items-center justify-center gap-2",
        getStatusStyles()
      )}
      style={{
        left: `${table.xPosition}%`,
        top: `${table.yPosition}%`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="text-lg font-semibold text-gray-100">
        Table {table.tableNumber}
      </div>
      <div className={cn(
        "text-base font-medium px-3 py-1 rounded-full bg-black/30",
        getStatusColor()
      )}>
        {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
      </div>
    </div>
  );
};

const FloorPlanView = ({ tables, floorPlan }: { tables: any[], floorPlan: any }) => {
  return (
    <div className="relative w-full h-[600px] rounded-3xl bg-gradient-to-br from-gray-950 to-gray-900 p-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:24px_24px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      
      {tables.map((table) => (
        <TableCard
          key={table.id}
          table={table}
          status={{
            status: table.status || 'free',
            tableNumber: table.tableNumber
          }}
        />
      ))}
    </div>
  );
};

export default FloorPlanView; 