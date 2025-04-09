import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { insertTableConfigSchema, insertTableSchema } from "@shared/schema";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { FloorPlan, FloorPlanWithTables, TableConfig } from "@shared/schema";

type TableConfigFormProps = {
  onComplete: (data: any) => void;
  restaurantId: number;
  floorPlans: FloorPlan[];
};

// Extended schema for form validation
const tableConfigFormSchema = z.object({
  automaticNumbering: z.boolean().default(true),
  startingNumber: z.coerce.number().min(1, "Starting number must be at least 1"),
  tablesPerFloor: z.record(z.string(), z.coerce.number().min(1, "Must have at least 1 table"))
});

const TableConfigForm = ({
  onComplete,
  restaurantId,
  floorPlans,
}: TableConfigFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFloorIndex, setCurrentFloorIndex] = useState("0");
  const [floorPlanDetails, setFloorPlanDetails] = useState<FloorPlanWithTables[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<z.infer<typeof tableConfigFormSchema>>({
    resolver: zodResolver(tableConfigFormSchema),
    defaultValues: {
      automaticNumbering: true,
      startingNumber: 1,
      tablesPerFloor: floorPlans.reduce((acc, plan) => {
        acc[plan.id.toString()] = 8; // Default 8 tables per floor
        return acc;
      }, {} as Record<string, number>)
    },
  });

  const automaticNumbering = form.watch("automaticNumbering");
  const tablesPerFloor = form.watch("tablesPerFloor");
  const startingNumber = form.watch("startingNumber");

  // Load existing floor plans with tables
  useEffect(() => {
    const fetchFloorPlansWithTables = async () => {
      try {
        const details: FloorPlanWithTables[] = [];
        
        // Fetch details for each floor plan
        for (const plan of floorPlans) {
          try {
            const res = await apiRequest("GET", `/api/floor-plans/${plan.id}/with-tables`);
            const data = await res.json();
            details.push(data);
          } catch (error) {
            console.error(`Failed to fetch details for floor plan ${plan.id}:`, error);
            // Add the basic plan without tables
            details.push({
              ...plan,
              tables: []
            });
          }
        }
        
        setFloorPlanDetails(details);
      } catch (error) {
        console.error("Failed to fetch floor plans with tables:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (floorPlans.length > 0) {
      fetchFloorPlansWithTables();
    } else {
      setIsLoading(false);
    }
  }, [floorPlans]);

  const getCurrentFloorPlan = () => {
    const index = parseInt(currentFloorIndex);
    return floorPlanDetails[index] || floorPlans[index];
  };

  const handleSubmit = async (data: z.infer<typeof tableConfigFormSchema>) => {
    setIsSubmitting(true);
    try {
      for (let i = 0; i < floorPlans.length; i++) {
        const floorPlan = floorPlans[i];
        const floorDetail = floorPlanDetails[i];
        const floorId = floorPlan.id;
        
        let tableNumber = data.startingNumber;
        if (i > 0) {
          // For floors after the first, continue numbering from previous floors
          const prevFloorTables = Object.entries(data.tablesPerFloor)
            .filter(([id, _]) => parseInt(id) < floorId)
            .reduce((sum, [_, count]) => sum + count, 0);
          tableNumber += prevFloorTables;
        }
        
        // If the floor already has tables and we're not using automatic numbering, keep them
        if (!data.automaticNumbering && floorDetail?.tables?.length > 0) {
          continue;
        }
        
        // Delete existing tables for this floor if we're using automatic numbering
        if (floorDetail?.tables?.length > 0) {
          for (const table of floorDetail.tables) {
            if (table.config.id) {
              await apiRequest("DELETE", `/api/table-configs/${table.config.id}`);
            }
          }
        }
        
        // Create new tables for this floor
        const tableCount = data.tablesPerFloor[floorId.toString()] || 8;
        
        // Calculate grid layout (approximately square grid)
        const cols = Math.ceil(Math.sqrt(tableCount));
        const rows = Math.ceil(tableCount / cols);
        
        // Calculate table spacing
        const gridWidth = floorPlan.width;
        const gridHeight = floorPlan.height;
        const colSpacing = gridWidth / (cols + 1);
        const rowSpacing = gridHeight / (rows + 1);
        
        for (let t = 0; t < tableCount; t++) {
          // Create the table
          const tableRes = await apiRequest("POST", "/api/tables", {
            tableNumber: tableNumber + t,
            floorNumber: floorPlan.floorNumber,
            qrCodeUrl: `/table/${floorPlan.floorNumber}/${tableNumber + t}`
          });
          
          const table = await tableRes.json();
          
          // Calculate position in grid
          const row = Math.floor(t / cols);
          const col = t % cols;
          const xPos = Math.round(colSpacing * (col + 1));
          const yPos = Math.round(rowSpacing * (row + 1));
          
          // Create the table configuration
          await apiRequest("POST", "/api/table-configs", {
            tableId: table.id,
            floorPlanId: floorId,
            xPosition: xPos,
            yPosition: yPos,
            width: 3,
            height: 3,
            shape: t % 3 === 0 ? "round" : "rectangle", // Mix of shapes
            seats: t % 5 === 0 ? 6 : 4, // Mix of table sizes
            isActive: true
          });
        }
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ['/api/floor-plans'],
      });
      
      // Complete the step
      onComplete(data);
    } catch (error) {
      console.error("Failed to configure tables:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading floor plan details...</span>
      </div>
    );
  }

  if (floorPlans.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground mb-4">
          No floor plans found. Please go back and create floor plans first.
        </p>
        <Button onClick={() => onComplete({})}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="prose max-w-none">
        <h3>Configure Tables for Your Restaurant</h3>
        <p>
          Specify the number of tables for each floor and how they should be numbered.
          Tables will be automatically arranged in a grid layout on each floor.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Table Numbering Options</CardTitle>
              <CardDescription>
                Choose how tables should be numbered across your restaurant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="automaticNumbering"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Automatic Table Numbering</FormLabel>
                      <FormDescription>
                        Enable to automatically number tables sequentially across all floors
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {automaticNumbering && (
                <FormField
                  control={form.control}
                  name="startingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starting Table Number</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The first table will start with this number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tables Per Floor</CardTitle>
              <CardDescription>
                Specify how many tables to place on each floor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={currentFloorIndex}
                onValueChange={setCurrentFloorIndex}
                className="w-full"
              >
                <TabsList className="mb-4">
                  {floorPlans.map((plan, index) => (
                    <TabsTrigger key={index} value={index.toString()}>
                      {plan.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {floorPlans.map((plan, index) => (
                  <TabsContent key={index} value={index.toString()}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium">
                            Floor {plan.floorNumber}: {plan.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {plan.description || "No description"}
                          </p>
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name={`tablesPerFloor.${plan.id}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Tables</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={50}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              How many tables to place on this floor
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">
                          Preview: Table Numbering
                        </h4>
                        <div className="p-3 border rounded-md bg-muted/20">
                          <p className="text-sm">
                            Table numbers on this floor will be{" "}
                            <span className="font-semibold">
                              {automaticNumbering
                                ? calculateTableRange(
                                    floorPlans,
                                    index,
                                    tablesPerFloor,
                                    startingNumber
                                  )
                                : "manually assigned"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Configuring Tables...
              </>
            ) : (
              "Save Table Configuration and Continue"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

// Helper function to calculate table number range for a floor
function calculateTableRange(
  floorPlans: FloorPlan[],
  currentIndex: number,
  tablesPerFloor: Record<string, number>,
  startingNumber: number
): string {
  let start = startingNumber;
  
  // Add tables from previous floors
  for (let i = 0; i < currentIndex; i++) {
    const floorId = floorPlans[i].id.toString();
    start += tablesPerFloor[floorId] || 0;
  }
  
  // Calculate end
  const currentFloorId = floorPlans[currentIndex].id.toString();
  const end = start + (tablesPerFloor[currentFloorId] || 0) - 1;
  
  return `${start} to ${end}`;
}

export default TableConfigForm;