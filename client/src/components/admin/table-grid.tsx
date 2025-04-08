import { TableWithOrder } from "@shared/schema";
import { getTableStatusColor, getTableStatusText, getTableStatusTextColor } from "@/lib/utils";
import { TableProperties } from "lucide-react";

interface TableGridProps {
  tables: TableWithOrder[];
  onTableClick: (table: TableWithOrder) => void;
}

export default function TableGrid({ tables, onTableClick }: TableGridProps) {
  return (
    <div className="p-6 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {tables.map((table) => (
        <div key={table.id} className="restaurant-table">
          <button
            onClick={() => onTableClick(table)}
            className={`w-full aspect-square rounded-lg border-2 ${getTableStatusColor(table.order)} flex flex-col items-center justify-center p-2 hover:bg-opacity-80 transition-colors`}
          >
            <TableProperties className={`mb-1 ${getTableStatusTextColor(table.order)}`} />
            <span className="text-gray-900 font-medium">Table {table.tableNumber}</span>
            <span className={`text-xs ${getTableStatusTextColor(table.order)}`}>
              {getTableStatusText(table.order)}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
