import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UtensilsCrossed, 
  CheckCircle, 
  TableProperties, 
  DollarSign 
} from "lucide-react";

interface StatsData {
  activeOrders: number;
  completedOrders: number;
  occupiedTables: number;
  totalTables: number;
  todaysRevenue: number;
}

interface StatsCardsProps {
  stats?: StatsData;
  isLoading: boolean;
}

export default function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mt-1" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
              <div className="flex items-center mt-3">
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const { activeOrders, completedOrders, occupiedTables, totalTables, todaysRevenue } = stats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Active Orders Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Active Orders</p>
              <h3 className="text-2xl font-poppins font-bold mt-1">{activeOrders}</h3>
            </div>
            <div className="bg-orange-100 rounded-full p-2">
              <UtensilsCrossed className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-sm">
            <ComparisonIndicator 
              value={8} 
              label="from yesterday" 
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Completed Orders Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Completed Orders</p>
              <h3 className="text-2xl font-poppins font-bold mt-1">{completedOrders}</h3>
            </div>
            <div className="bg-green-100 rounded-full p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-sm">
            <ComparisonIndicator 
              value={12} 
              label="from yesterday" 
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Tables Occupied Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Tables Occupied</p>
              <h3 className="text-2xl font-poppins font-bold mt-1">{occupiedTables}/{totalTables}</h3>
            </div>
            <div className="bg-amber-100 rounded-full p-2">
              <TableProperties className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-sm">
            <ComparisonIndicator 
              value={Math.round((occupiedTables / totalTables) * 100)} 
              label="capacity" 
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Today's Revenue Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Today's Revenue</p>
              <h3 className="text-2xl font-poppins font-bold mt-1">{formatPrice(todaysRevenue)}</h3>
            </div>
            <div className="bg-blue-100 rounded-full p-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-sm">
            <ComparisonIndicator 
              value={-3} 
              label="from yesterday" 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for displaying comparison indicators
function ComparisonIndicator({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0;
  
  return (
    <>
      <span className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        {Math.abs(value)}%
      </span>
      <span className="text-gray-500 ml-2">{label}</span>
    </>
  );
}
