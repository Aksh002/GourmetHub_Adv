import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { insertFloorPlanSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FloorPlan } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Trash2 } from "lucide-react";

type FloorPlanFormProps = {
  onComplete: (data: any) => void;
  restaurantId: number;
  initialData?: FloorPlan[];
};

// Extend the schema for form validation
const floorPlanFormSchema = insertFloorPlanSchema
  .extend({
    name: z.string().min(1, "Floor name is required"),
    floorNumber: z.coerce.number().min(1, "Floor number must be at least 1"),
    width: z.coerce.number().min(5, "Width must be at least 5 units"),
    height: z.coerce.number().min(5, "Height must be at least 5 units"),
  })
  .omit({ restaurantId: true });

interface FloorPlanFormData extends z.infer<typeof floorPlanFormSchema> {
  id?: number;
}

const FloorPlanForm = ({
  onComplete,
  restaurantId,
  initialData,
}: FloorPlanFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [floorPlans, setFloorPlans] = useState<FloorPlanFormData[]>([]);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [currentTabIndex, setCurrentTabIndex] = useState("0");
  const [savedIds, setSavedIds] = useState<number[]>([]);

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setFloorPlans(initialData);
      setSavedIds(initialData.map(plan => plan.id));
      setIsLoading(false);
    } else if (restaurantId) {
      // Fetch floor plans if not provided
      const fetchFloorPlans = async () => {
        try {
          const res = await apiRequest(
            "GET",
            `/api/floor-plans?restaurantId=${restaurantId}`
          );
          const data = await res.json();
          
          if (data && data.length > 0) {
            setFloorPlans(data);
            setSavedIds(data.map((plan: FloorPlan) => plan.id));
          } else {
            // Add a default floor plan if none exist
            setFloorPlans([
              {
                name: "Main Floor",
                floorNumber: 1,
                description: "Main dining area",
                width: 20,
                height: 15,
                isActive: true,
              },
            ]);
          }
        } catch (error) {
          console.error("Failed to fetch floor plans:", error);
          // Add a default floor plan
          setFloorPlans([
            {
              name: "Main Floor",
              floorNumber: 1,
              description: "Main dining area",
              width: 20,
              height: 15,
              isActive: true,
            },
          ]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchFloorPlans();
    } else {
      // Add a default floor plan
      setFloorPlans([
        {
          name: "Main Floor",
          floorNumber: 1,
          description: "Main dining area",
          width: 20,
          height: 15,
          isActive: true,
        },
      ]);
      setIsLoading(false);
    }
  }, [initialData, restaurantId]);

  const handleAddFloorPlan = () => {
    const newFloorNumber = floorPlans.length > 0 
      ? Math.max(...floorPlans.map(plan => plan.floorNumber)) + 1 
      : 1;
    
    setFloorPlans([
      ...floorPlans,
      {
        name: `Floor ${newFloorNumber}`,
        floorNumber: newFloorNumber,
        description: "",
        width: 20,
        height: 15,
        isActive: true,
      },
    ]);
    
    // Switch to the new tab
    setCurrentTabIndex(floorPlans.length.toString());
  };

  const handleRemoveFloorPlan = (index: number) => {
    // If this is a saved floor plan, we need to delete it from the server
    const floorPlan = floorPlans[index];
    if (floorPlan.id) {
      // Ask for confirmation
      if (!confirm("Are you sure you want to delete this floor plan? All tables on this floor will also be deleted.")) {
        return;
      }
      
      // Delete from server
      apiRequest("DELETE", `/api/floor-plans/${floorPlan.id}`)
        .then(() => {
          // Update savedIds
          setSavedIds(savedIds.filter(id => id !== floorPlan.id));
          
          // Remove from state
          const newFloorPlans = [...floorPlans];
          newFloorPlans.splice(index, 1);
          setFloorPlans(newFloorPlans);
          
          // Switch to first tab if we removed the current tab
          if (parseInt(currentTabIndex) === index) {
            setCurrentTabIndex("0");
          } else if (parseInt(currentTabIndex) > index) {
            // Adjust the tab index if we removed a tab before the current one
            setCurrentTabIndex((parseInt(currentTabIndex) - 1).toString());
          }
        })
        .catch(error => {
          console.error("Failed to delete floor plan:", error);
          alert("Failed to delete floor plan. Please try again.");
        });
    } else {
      // Just remove from state
      const newFloorPlans = [...floorPlans];
      newFloorPlans.splice(index, 1);
      setFloorPlans(newFloorPlans);
      
      // Switch to first tab if we removed the current tab
      if (parseInt(currentTabIndex) === index) {
        setCurrentTabIndex("0");
      } else if (parseInt(currentTabIndex) > index) {
        // Adjust the tab index if we removed a tab before the current one
        setCurrentTabIndex((parseInt(currentTabIndex) - 1).toString());
      }
    }
  };

  const handleUpdateFloorPlan = (index: number, data: FloorPlanFormData) => {
    const newFloorPlans = [...floorPlans];
    newFloorPlans[index] = { ...newFloorPlans[index], ...data };
    setFloorPlans(newFloorPlans);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Create or update floor plans
      const savedPlans = [];
      
      for (const plan of floorPlans) {
        const payload = {
          ...plan,
          restaurantId,
        };
        
        let savedPlan;
        if (plan.id) {
          // Update existing floor plan
          const res = await apiRequest("PUT", `/api/floor-plans/${plan.id}`, payload);
          savedPlan = await res.json();
        } else {
          // Create new floor plan
          const res = await apiRequest("POST", "/api/floor-plans", payload);
          savedPlan = await res.json();
        }
        
        savedPlans.push(savedPlan);
      }
      
      // Update state with saved plans
      setFloorPlans(savedPlans);
      setSavedIds(savedPlans.map(plan => plan.id));
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/floor-plans/restaurant/${restaurantId}`],
      });
      
      // Complete the step
      onComplete(savedPlans);
    } catch (error) {
      console.error("Failed to save floor plans:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading floor plans...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="prose max-w-none">
        <h3>Define Your Restaurant's Floor Plans</h3>
        <p>
          Create floor plans for each level of your restaurant. Define the dimensions 
          and layout of each floor. You'll be able to place tables on these floor plans 
          in the next step.
        </p>
      </div>

      {floorPlans.length > 0 ? (
        <Tabs 
          value={currentTabIndex} 
          onValueChange={setCurrentTabIndex}
          className="w-full"
        >
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              {floorPlans.map((_, index) => (
                <TabsTrigger key={index} value={index.toString()}>
                  Floor {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddFloorPlan}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Floor
              </Button>
              
              {floorPlans.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveFloorPlan(parseInt(currentTabIndex))}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>

          {floorPlans.map((floorPlan, index) => (
            <TabsContent key={index} value={index.toString()}>
              <Card>
                <CardHeader>
                  <CardTitle>Floor {index + 1} Configuration</CardTitle>
                  <CardDescription>
                    Define the layout and dimensions of this floor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FloorPlanEditor
                    floorPlan={floorPlan}
                    onChange={(data) => handleUpdateFloorPlan(index, data)}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">No floor plans defined</p>
          <Button onClick={handleAddFloorPlan}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Floor
          </Button>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        className="w-full"
        disabled={isSubmitting || floorPlans.length === 0}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save and Continue"
        )}
      </Button>
    </div>
  );
};

interface FloorPlanEditorProps {
  floorPlan: FloorPlanFormData;
  onChange: (data: FloorPlanFormData) => void;
}

const FloorPlanEditor = ({
  floorPlan,
  onChange,
}: FloorPlanEditorProps) => {
  const form = useForm<FloorPlanFormData>({
    resolver: zodResolver(floorPlanFormSchema),
    defaultValues: {
      name: floorPlan.name || "",
      floorNumber: floorPlan.floorNumber || 1,
      description: floorPlan.description || "",
      width: floorPlan.width || 20,
      height: floorPlan.height || 15,
      isActive: floorPlan.isActive !== false,
    },
  });

  // Update form when floorPlan changes
  useEffect(() => {
    form.reset({
      name: floorPlan.name || "",
      floorNumber: floorPlan.floorNumber || 1,
      description: floorPlan.description || "",
      width: floorPlan.width || 20,
      height: floorPlan.height || 15,
      isActive: floorPlan.isActive !== false,
    });
  }, [floorPlan, form]);

  // Update parent component when form values change
  const handleFieldChange = (field: keyof FloorPlanFormData, value: any) => {
    onChange({
      ...floorPlan,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Floor Name</label>
        <Input 
          id="name"
          value={form.watch("name") || ""}
          onChange={(e) => {
            form.setValue("name", e.target.value);
            handleFieldChange("name", e.target.value);
          }}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="floorNumber" className="text-sm font-medium">Floor Number</label>
        <Input 
          id="floorNumber"
          type="number"
          value={form.watch("floorNumber") || 1}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            form.setValue("floorNumber", value);
            handleFieldChange("floorNumber", value);
          }}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">Description</label>
        <Textarea 
          id="description"
          value={form.watch("description") || ""}
          onChange={(e) => {
            form.setValue("description", e.target.value);
            handleFieldChange("description", e.target.value);
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="width" className="text-sm font-medium">Width (units)</label>
          <Input 
            id="width"
            type="number"
            value={form.watch("width") || 20}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              form.setValue("width", value);
              handleFieldChange("width", value);
            }}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="height" className="text-sm font-medium">Height (units)</label>
          <Input 
            id="height"
            type="number"
            value={form.watch("height") || 15}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              form.setValue("height", value);
              handleFieldChange("height", value);
            }}
          />
        </div>
      </div>

      <div className="flex items-start space-x-3 space-y-0">
        <input
          id="isActive"
          type="checkbox"
          checked={form.watch("isActive")}
          onChange={(e) => {
            form.setValue("isActive", e.target.checked);
            handleFieldChange("isActive", e.target.checked);
          }}
          className="mt-1"
        />
        <div className="space-y-1 leading-none">
          <label htmlFor="isActive" className="text-sm font-medium">Active Floor</label>
          <p className="text-sm text-gray-500">Only active floors will be shown to customers</p>
        </div>
      </div>
    </div>
  );
};

export default FloorPlanForm;