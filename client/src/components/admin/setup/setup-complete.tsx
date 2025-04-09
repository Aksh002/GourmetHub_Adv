import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { RestaurantWithDetails } from "@shared/schema";
import { Check, ChevronRight } from "lucide-react";

type SetupCompleteProps = {
  onComplete: (data: any) => void;
  restaurantDetails: RestaurantWithDetails;
};

const SetupComplete = ({ onComplete, restaurantDetails }: SetupCompleteProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = () => {
    setIsSubmitting(true);
    onComplete({ isConfigured: true });
    // No need to set isSubmitting to false as we'll be redirecting
  };

  // Count tables by floor
  const tablesByFloor = restaurantDetails.floorPlans.reduce((acc, floorPlan) => {
    acc[floorPlan.floorNumber] = floorPlan.tables.length;
    return acc;
  }, {} as Record<number, number>);

  const totalTables = Object.values(tablesByFloor).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">Setup Complete!</h2>
        <p className="text-muted-foreground mt-2">
          Your restaurant configuration is ready. Here's a summary of what you've set up:
        </p>
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="font-medium">Restaurant Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Name:</div>
            <div>{restaurantDetails.name}</div>
            <div className="text-muted-foreground">Address:</div>
            <div>{restaurantDetails.address}</div>
            <div className="text-muted-foreground">Phone:</div>
            <div>{restaurantDetails.phone}</div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <h3 className="font-medium">Operating Hours</h3>
          <div className="grid grid-cols-1 gap-2 text-sm">
            {restaurantDetails.operatingHours.map((hours) => (
              <div key={hours.id} className="flex justify-between">
                <span>
                  {getDayName(hours.dayOfWeek)}:
                </span>
                <span>
                  {hours.isClosed
                    ? "Closed"
                    : `${hours.openTime} - ${hours.closeTime}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <h3 className="font-medium">Floor Plans & Tables</h3>
          <div className="grid grid-cols-1 gap-2 text-sm">
            {restaurantDetails.floorPlans.map((floorPlan) => (
              <div key={floorPlan.id} className="flex justify-between">
                <span>
                  {floorPlan.name} (Floor {floorPlan.floorNumber}):
                </span>
                <span>
                  {floorPlan.tables.length} tables
                </span>
              </div>
            ))}
            <div className="flex justify-between font-medium mt-1">
              <span>Total:</span>
              <span>{totalTables} tables</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center space-y-4">
        <p className="text-muted-foreground">
          Your restaurant setup is complete and you're ready to start managing your
          restaurant! Click below to access your admin dashboard.
        </p>
        <Button 
          size="lg" 
          onClick={handleComplete} 
          disabled={isSubmitting}
        >
          Go to Dashboard
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

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

export default SetupComplete;