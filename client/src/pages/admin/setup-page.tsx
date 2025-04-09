import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

import RestaurantInfoForm from "@/components/admin/setup/restaurant-info-form";
import OperatingHoursForm from "@/components/admin/setup/operating-hours-form";
import FloorPlanForm from "@/components/admin/setup/floor-plan-form";
import TableConfigForm from "@/components/admin/setup/table-config-form";
import SetupComplete from "@/components/admin/setup/setup-complete";

const steps = [
  { title: "Restaurant Information", description: "Basic details about your restaurant" },
  { title: "Operating Hours", description: "When your restaurant is open" },
  { title: "Floor Plans", description: "Layout of your restaurant floors" },
  { title: "Table Configuration", description: "Tables and seating arrangement" },
  { title: "Complete", description: "Setup is complete" },
];

const SetupPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [restaurantData, setRestaurantData] = useState<any>({});
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Update progress when step changes
  useEffect(() => {
    const progressValue = ((currentStep) / (steps.length - 1)) * 100;
    setProgress(progressValue);
  }, [currentStep]);

  // Handle restaurant info step completion
  const handleRestaurantInfoComplete = async (data: any) => {
    try {
      // Check if we're updating an existing restaurant
      if (restaurantData.id) {
        const res = await apiRequest("PUT", `/api/restaurant/${restaurantData.id}`, {
          ...data,
          isConfigured: false, // Still in setup process
        });
        const updatedRestaurant = await res.json();
        setRestaurantData({ ...restaurantData, ...updatedRestaurant });
      } else {
        // Create a new restaurant
        const res = await apiRequest("POST", "/api/restaurant", {
          ...data,
          isConfigured: false, // Still in setup process
        });
        const newRestaurant = await res.json();
        setRestaurantData({ ...restaurantData, ...newRestaurant });
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
        description: "There was a problem saving your restaurant details. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle operating hours step completion
  const handleOperatingHoursComplete = (data: any) => {
    setRestaurantData({
      ...restaurantData,
      operatingHours: data,
    });
    setCurrentStep(2);
    toast({
      title: "Operating hours saved",
      description: "Your restaurant's operating hours have been saved successfully.",
    });
  };

  // Handle floor plan step completion
  const handleFloorPlanComplete = (data: any) => {
    setRestaurantData({
      ...restaurantData,
      floorPlans: data,
    });
    setCurrentStep(3);
    toast({
      title: "Floor plans saved",
      description: "Your restaurant's floor plans have been saved successfully.",
    });
  };

  // Handle table configuration step completion
  const handleTableConfigComplete = (data: any) => {
    setRestaurantData({
      ...restaurantData,
      tableConfig: data,
    });
    
    // Fetch the complete restaurant data with all details
    const fetchCompleteRestaurant = async () => {
      try {
        const res = await apiRequest("GET", `/api/restaurant/${restaurantData.id}/with-details`);
        const completeRestaurant = await res.json();
        setRestaurantData(completeRestaurant);
        setCurrentStep(4);
        toast({
          title: "Table configuration saved",
          description: "Your restaurant's tables have been configured successfully.",
        });
      } catch (error) {
        console.error("Failed to fetch complete restaurant data:", error);
        // Still proceed to next step even if fetch fails
        setCurrentStep(4);
        toast({
          title: "Table configuration saved",
          description: "Tables configured, but couldn't retrieve complete restaurant data.",
        });
      }
    };
    
    fetchCompleteRestaurant();
  };

  // Handle setup completion
  const handleSetupComplete = async (data: any) => {
    try {
      // Mark restaurant as configured
      const res = await apiRequest("PUT", `/api/restaurant/${restaurantData.id}`, {
        ...restaurantData,
        isConfigured: true,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ['/api/restaurant'],
      });
      
      // Redirect to dashboard
      setLocation("/admin");
      toast({
        title: "Setup complete",
        description: "Your restaurant is now configured and ready to use.",
      });
    } catch (error) {
      console.error("Failed to complete setup:", error);
      toast({
        title: "Error completing setup",
        description: "There was a problem finalizing your restaurant setup. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Load existing restaurant data if available
  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await apiRequest("GET", "/api/restaurant");
        const restaurant = await res.json();
        
        if (restaurant) {
          setRestaurantData(restaurant);
          
          // Determine which step to start at based on configuration
          if (restaurant.isConfigured) {
            // If already configured, either redirect or allow reconfiguration
            // Here we'll allow reconfiguration by setting to step 0
            setCurrentStep(0);
          } else {
            // Determine step based on what's already configured
            if (restaurant.floorPlans && restaurant.floorPlans.length > 0) {
              // If floor plans exist, go to table configuration
              setCurrentStep(3);
            } else if (restaurant.operatingHours && restaurant.operatingHours.length > 0) {
              // If operating hours exist, go to floor plans
              setCurrentStep(2);
            } else {
              // Otherwise start with operating hours
              setCurrentStep(1);
            }
          }
        }
      } catch (error) {
        // If no restaurant exists, start at step 0
        console.error("No restaurant found or error fetching restaurant:", error);
      }
    };

    fetchRestaurant();
  }, []);

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Restaurant Setup</h1>
        <p className="text-muted-foreground">
          Complete the following steps to configure your restaurant management system.
        </p>
      </div>

      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm font-medium">{progress.toFixed(0)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex mb-6">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex-1 text-center ${
              index < currentStep
                ? "text-primary"
                : index === currentStep
                ? "text-primary font-medium"
                : "text-muted-foreground"
            }`}
          >
            <div className="hidden md:block text-sm">{step.title}</div>
            <div className="text-xs md:hidden">{index + 1}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-lg shadow-sm p-6">
        {currentStep === 0 && (
          <RestaurantInfoForm
            onComplete={handleRestaurantInfoComplete}
            initialData={restaurantData}
          />
        )}

        {currentStep === 1 && (
          <OperatingHoursForm
            onComplete={handleOperatingHoursComplete}
            restaurantId={restaurantData.id}
            initialData={restaurantData.operatingHours}
          />
        )}

        {currentStep === 2 && (
          <FloorPlanForm
            onComplete={handleFloorPlanComplete}
            restaurantId={restaurantData.id}
            initialData={restaurantData.floorPlans}
          />
        )}

        {currentStep === 3 && (
          <TableConfigForm
            onComplete={handleTableConfigComplete}
            restaurantId={restaurantData.id}
            floorPlans={restaurantData.floorPlans || []}
          />
        )}

        {currentStep === 4 && (
          <SetupComplete
            onComplete={handleSetupComplete}
            restaurantDetails={restaurantData}
          />
        )}
      </div>

      {currentStep > 0 && currentStep < 4 && (
        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(currentStep - 1)}
          >
            Back
          </Button>
        </div>
      )}
    </div>
  );
};

export default SetupPage;