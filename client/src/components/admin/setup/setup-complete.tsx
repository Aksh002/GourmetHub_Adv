// Helper function to get day name
function getDayName(dayOfWeek: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayOfWeek] || "Unknown";
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableWithConfig, FloorPlan } from "@/types/table-types";
import { ChevronRight } from "lucide-react";

interface SetupCompleteProps {
  onComplete: () => void;
  restaurantDetails: {
    name: string;
    address: string;
    phone: string;
    email: string;
    floorPlans: FloorPlan[];
    tables: TableWithConfig[];
  };
}

export default function SetupComplete({ onComplete, restaurantDetails }: SetupCompleteProps) {
  // Calculate total tables and tables per floor with null checks
  const totalTables = restaurantDetails?.tables?.length ?? 0;
  const tablesByFloor = restaurantDetails?.tables?.reduce((acc, table) => {
    const floorNumber = table.floorNumber;
    acc[floorNumber] = (acc[floorNumber] || 0) + 1;
    return acc;
  }, {} as Record<number, number>) ?? {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Name</p>
              <p>{restaurantDetails?.name ?? 'Not set'}</p>
            </div>
            <div>
              <p className="font-medium">Address</p>
              <p>{restaurantDetails?.address ?? 'Not set'}</p>
            </div>
            <div>
              <p className="font-medium">Phone</p>
              <p>{restaurantDetails?.phone ?? 'Not set'}</p>
            </div>
            <div>
              <p className="font-medium">Email</p>
              <p>{restaurantDetails?.email ?? 'Not set'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Floor Plans and Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="font-medium">Total Tables</p>
              <p>{totalTables} tables</p>
            </div>
            <div>
              <p className="font-medium">Tables by Floor</p>
              <div className="space-y-2">
                {Object.entries(tablesByFloor).map(([floor, count]) => (
                  <div key={floor} className="flex justify-between">
                    <span>Floor {floor}</span>
                    <span>{count} tables</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium">Floor Plans</p>
              <div className="space-y-2">
                {restaurantDetails?.floorPlans?.map((floorPlan) => (
                  <div key={floorPlan.id} className="flex justify-between">
                    <span>{floorPlan.name}</span>
                    <span>Floor {floorPlan.floorNumber}</span>
                  </div>
                )) ?? <p>No floor plans configured</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center space-y-4">
        <p className="text-muted-foreground">
          Your restaurant setup is complete and you're ready to start managing your
          restaurant! Click below to access your admin dashboard.
        </p>
        <Button 
          size="lg" 
          onClick={onComplete}
        >
          Go to Dashboard
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}