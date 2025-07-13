import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { FloorPlan, TableWithConfig } from "@/types/table-types";
import { TableWithPosition } from "@/types/tables";

import RestaurantInfoForm from "@/components/admin/setup/restaurant-info-form";
import OperatingHoursForm from "@/components/admin/setup/operating-hours-form";
import FloorPlanForm from "@/components/admin/setup/floor-plan-form";
import TableConfigForm from "@/components/admin/setup/table-config-form";
import SetupComplete from "@/components/admin/setup/setup-complete";

type SetupStep = number | "complete";

const isNumericStep = (step: SetupStep): step is number => typeof step === "number";

const steps = [
  { title: "Restaurant Information", description: "Basic details about your restaurant" },
  { title: "Operating Hours", description: "When your restaurant is open" },
  { title: "Floor Plans", description: "Layout of your restaurant floors" },
  { title: "Table Configuration", description: "Tables and seating arrangement" },
  { title: "Complete", description: "Setup is complete" },
];

interface TableConfigFormProps {
  onComplete: (tableConfig: TableConfig) => Promise<void>;
  floorPlans: FloorPlan[];
}

interface TableConfigFormData {
  floorPlans: FloorPlan[];
  tableConfigs: TableWithConfig[];
}

interface TableConfig {
  tableNumber: number;
  floorNumber: number;
  floorPlanId: number;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  shape: string;
  seats: number;
}

const SetupPage = () => {
  const [currentStep, setCurrentStep] = useState<SetupStep>(0);
  const [progress, setProgress] = useState(0);
  const [restaurantData, setRestaurantData] = useState<any>({});
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Update progress when step changes
  useEffect(() => {
    if (isNumericStep(currentStep)) {
      const progressValue = (currentStep / (steps.length - 1)) * 100;
      setProgress(progressValue);
    }
  }, [currentStep]);

  // Load existing restaurant data if available
  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        // If user has a restaurantId, use that to fetch the specific restaurant
        if (user?.restaurantId) {
          console.log("[DEBUG] Fetching restaurant for user:", user.id);
          const res = await apiRequest("GET", `/api/restaurant/${user.restaurantId}`);
          if (!res.ok) {
            throw new Error('Failed to fetch restaurant data');
          }
          const restaurant = await res.json();
          setRestaurantData(restaurant || {});
        } else {
          // Otherwise, fetch the default restaurant
          console.log("[DEBUG] Fetching default restaurant");
          const res = await apiRequest("GET", "/api/restaurant");
          if (!res.ok) {
            throw new Error('Failed to fetch restaurant data');
          }
          const restaurant = await res.json();
          setRestaurantData(restaurant || {});
        }
      } catch (error) {
        console.error("Error fetching restaurant:", error);
        setRestaurantData({});
      }
    };

    fetchRestaurant();
  }, [user]);

  // Always start at step 0 when component mounts
  useEffect(() => {
    setCurrentStep(0);
  }, []);

  // Handle restaurant info step completion
  const handleRestaurantInfoComplete = async (data: any) => {
    try {
      setIsLoading(true);
      // Check if we're updating an existing restaurant
      if (restaurantData.id) {
        const res = await apiRequest("PUT", `/api/restaurant/${restaurantData.id}`, {
          ...data,
          isConfigured: false, // Still in setup process
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Failed to update restaurant');
        }
        const updatedRestaurant = await res.json();
        setRestaurantData(updatedRestaurant);
      } else {
        // Create a new restaurant
        const res = await apiRequest("POST", "/api/restaurant", {
          ...data,
          isConfigured: false, // Still in setup process
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Failed to create restaurant');
        }
        const newRestaurant = await res.json();
        setRestaurantData(newRestaurant);
      }

      // Move to next step
      setCurrentStep(1);
      toast({
        title: "Restaurant information saved",
        description: "Basic restaurant details have been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to save restaurant info:", error);
      toast({
        title: "Error saving restaurant information",
        description: error instanceof Error ? error.message : "There was a problem saving your restaurant details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle operating hours step completion
  const handleOperatingHoursComplete = async (data: any) => {
    try {
      setIsLoading(true);
      setRestaurantData({
        ...restaurantData,
        operatingHours: data,
      });
      setCurrentStep(2);
      toast({
        title: "Operating hours saved",
        description: "Your restaurant's operating hours have been saved successfully.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle floor plan step completion
  const handleFloorPlanComplete = async (data: any) => {
    try {
      setIsLoading(true);
      setRestaurantData({
        ...restaurantData,
        floorPlans: data,
      });
      setCurrentStep(3);
      toast({
        title: "Floor plans saved",
        description: "Your restaurant's floor plans have been saved successfully.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle table configuration step completion
  const handleTableConfigComplete = async (data: { floorPlans: FloorPlan[]; tableConfigs: TableWithConfig[]; }) => {
    try {
      // Create tables for each table config
      for (const tableConfig of data.tableConfigs) {
        try {
          // Create the table first
          const tableResponse = await apiRequest(
            "POST",
            "/api/tables",
            {
              tableNumber: tableConfig.tableNumber,
              floorNumber: tableConfig.floorNumber,
              qrCodeUrl: `/table/${tableConfig.floorNumber}/${tableConfig.tableNumber}`,
              status: "available"
            }
          );

          if (!tableResponse.ok) {
            const errorData = await tableResponse.json();
            throw new Error(`Failed to create table: ${errorData.message || 'Unknown error'}`);
          }

          const table = await tableResponse.json();
          console.log("[DEBUG] Created table:", table);

          // Create the table configuration using the newly created table's ID
          const configResponse = await apiRequest(
            "POST",
            "/api/table-configs",
            {
              tableId: table.id, // Use the actual table ID from the created table
              floorPlanId: tableConfig.config.floorPlanId,
              xPosition: tableConfig.config.xPosition,
              yPosition: tableConfig.config.yPosition,
              width: tableConfig.config.width,
              height: tableConfig.config.height,
              shape: tableConfig.config.shape,
              seats: tableConfig.config.seats,
              isActive: true
            }
          );

          if (!configResponse.ok) {
            const errorData = await configResponse.json();
            throw new Error(`Failed to create table configuration: ${errorData.message || 'Unknown error'}`);
          }

          const config = await configResponse.json();
          console.log("[DEBUG] Created table config:", config);
        } catch (error) {
          console.error(`[ERROR] Failed to create table ${tableConfig.tableNumber} for floor ${tableConfig.floorNumber}:`, error);
          throw error;
        }
      }

      // Refresh floor plans to show new tables
      await queryClient.invalidateQueries({ queryKey: ["floorPlans"] });

      // Update restaurantData with the new tables
      setRestaurantData((prev: any) => ({
        ...prev,
        floorPlans: data.floorPlans,
        tables: data.tableConfigs.map(config => ({
          id: config.id,
          tableNumber: config.tableNumber,
          floorNumber: config.floorNumber,
          qrCodeUrl: config.qrCodeUrl,
          config: {
            ...config.config,
            id: config.id
          }
        }))
      }));

      toast({
        title: "Success",
        description: "Table configurations created successfully",
      });

      // Advance to the next step
      setCurrentStep("complete");
    } catch (error) {
      console.error("Error creating table configurations:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create table configurations",
        variant: "destructive",
      });
    }
  };

  // Handle setup completion
  const handleSetupComplete = async () => {
    try {
      setIsLoading(true);
      
      // First, check if we have a restaurant ID
      if (!restaurantData.id) {
        throw new Error('Restaurant ID not found. Please complete the restaurant information step first.');
      }

      console.log("[DEBUG] Updating restaurant with ID:", restaurantData.id);
      console.log("[DEBUG] Current restaurant data:", restaurantData);

      // Update restaurant to mark setup as complete, including all existing data
      const res = await apiRequest("PUT", `/api/restaurant/${restaurantData.id}`, {
        ...restaurantData,
        isConfigured: true
      });

      console.log("[DEBUG] Update response status:", res.status);
      
      if (!res.ok) {
        const error = await res.json();
        console.error("[DEBUG] Update failed:", error);
        throw new Error(error.message || 'Failed to complete setup');
      }

      // Update the restaurant data with the new isConfigured status
      const updatedRestaurant = await res.json();
      console.log("[DEBUG] Updated restaurant data:", updatedRestaurant);
      
      // Update the query cache directly with the new data
      queryClient.setQueryData(['/api/restaurant'], updatedRestaurant);
      
      // Update local state
      setRestaurantData(updatedRestaurant);

      // Invalidate and refetch to ensure consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/restaurant'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/user'] })
      ]);

      // Wait for all queries to be refetched and ensure they complete
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['/api/restaurant'] }),
        queryClient.refetchQueries({ queryKey: ['/api/user'] })
      ]);

      toast({
        title: "Setup Complete",
        description: "Your restaurant has been configured successfully!",
      });

      // Add a longer delay to ensure the data is fully updated in the cache
      setTimeout(() => {
        // Navigate to the admin dashboard
        setLocation("/admin");
      }, 1000);
    } catch (error) {
      console.error("Failed to complete setup:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was a problem completing the setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (isNumericStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (isNumericStep(currentStep) && currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render the current step
  const renderCurrentStep = () => {
    if (currentStep === 0) {
      return (
        <RestaurantInfoForm
          onComplete={handleRestaurantInfoComplete}
          initialData={restaurantData}
        />
      );
    }
    if (currentStep === 1) {
      return (
        <OperatingHoursForm
          onComplete={handleOperatingHoursComplete}
          initialData={restaurantData.operatingHours}
          restaurantId={restaurantData.id}
        />
      );
    }
    if (currentStep === 2) {
      return (
        <FloorPlanForm
          onComplete={handleFloorPlanComplete}
          initialData={restaurantData.floorPlans}
          restaurantId={restaurantData.id}
        />
      );
    }
    if (currentStep === 3) {
      return (
        <TableConfigForm
          onComplete={handleTableConfigComplete}
          floorPlans={restaurantData.floorPlans || []}
        />
      );
    }
    if (currentStep === "complete") {
      return (
        <SetupComplete 
          onComplete={handleSetupComplete}
          restaurantDetails={restaurantData}
        />
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Restaurant Setup</h1>
          <p className="mt-2 text-sm text-gray-600">
            Complete the following steps to set up your restaurant
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="mb-6">
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-4">
            {typeof currentStep === 'number' && (
              <>
                <h2 className="text-xl font-semibold text-gray-900">
                  {steps[currentStep].title}
                </h2>
                <p className="text-sm text-gray-600">
                  {steps[currentStep].description}
                </p>
              </>
            )}
            {currentStep === "complete" && (
              <>
                <h2 className="text-xl font-semibold text-gray-900">
                  {steps[4].title}
                </h2>
                <p className="text-sm text-gray-600">
                  {steps[4].description}
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="mt-8">
            {renderCurrentStep()}
          </div>

          {typeof currentStep === 'number' && (
            <div className="mt-8 flex justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Next"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupPage;