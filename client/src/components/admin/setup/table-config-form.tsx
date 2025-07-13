import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FloorPlan, TableWithConfig, TablePosition as ImportedTablePosition, TableErrors } from "@/types/table-types";
import { tableConfigFormSchema, transformFloorPlanData } from "@/types/table-types";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { queryClient } from "@/lib/queryClient";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const MIN_EDGE_DISTANCE = 2;

interface FloorPlanDetails extends FloorPlan {
  tables: TablePosition[];
}

interface TableConfigFormData {
  tablesPerFloor: { [key: string]: number };
  automaticNumbering: boolean;
  startingNumber: number;
}

interface TableConfigFormState {
  previewTables: TablePosition[];
  isSubmitting: boolean;
  showPreview: boolean;
  currentFloorIndex: string;
  floorPlanDetails: FloorPlanDetails[];
  tableErrors: TableErrors;
  isLoading: boolean;
  errors: string[];
}

interface TablePosition {
  tableId: number;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  seats: number;
}

interface TableConfigFormProps {
  onComplete: (data: { floorPlans: FloorPlan[]; tableConfigs: TableWithConfig[]; }) => Promise<void>;
  floorPlans: FloorPlan[];
}

type FormData = z.infer<typeof tableConfigFormSchema>;

const TableConfigForm: React.FC<TableConfigFormProps> = ({ onComplete, floorPlans }) => {
  const { toast } = useToast();

  // Helper function to create default form values
  const createDefaultFormValues = () => {
    const defaultValues: { [key: string]: number } = {};
    if (floorPlans && Array.isArray(floorPlans)) {
      floorPlans.forEach((plan: FloorPlan) => {
        defaultValues[plan.id] = 0;
      });
    }
    return defaultValues;
  };

  // Move all state hooks to the top
  const [formState, setFormState] = useState<TableConfigFormState>({
    previewTables: [],
    isSubmitting: false,
    showPreview: false,
    currentFloorIndex: '0',
    floorPlanDetails: [],
    tableErrors: {},
    isLoading: false,
    errors: []
  });

  // Form setup with default values
  const defaultFormValues = {
    tablesPerFloor: createDefaultFormValues(),
      automaticNumbering: true,
    startingNumber: 1
  };

  const form = useForm<FormData>({
    resolver: zodResolver(tableConfigFormSchema),
    defaultValues: {
      automaticNumbering: true,
      startingNumber: 1,
      tablesPerFloor: {},
      tableConfigs: []
    }
  });

  // Watch form values
  const { watch, setValue, getValues } = form;
  const tablesPerFloor = watch('tablesPerFloor');
  const automaticNumbering = watch('automaticNumbering');
  const startingNumber = watch('startingNumber');

  // Destructure form state
  const {
    isLoading,
    errors,
    isSubmitting,
    floorPlanDetails,
    previewTables,
    tableErrors,
    currentFloorIndex,
    showPreview: formShowPreview
  } = formState;

  // State setters
  const setCurrentFloorIndex = useCallback((value: string) => 
    setFormState(prev => ({ ...prev, currentFloorIndex: value })), []);
    
  const setFloorPlanDetails = useCallback((value: FloorPlanDetails[]) => 
    setFormState(prev => ({ ...prev, floorPlanDetails: value })), []);
    
  const setPreviewTables = useCallback((tables: TablePosition[]) => {
    setFormState(prev => ({ ...prev, previewTables: tables }));
  }, []);
  
  const setTableErrors = useCallback((value: TableErrors) => 
    setFormState(prev => ({ ...prev, tableErrors: value })), []);
    
  const setIsLoading = useCallback((value: boolean) => 
    setFormState(prev => ({ ...prev, isLoading: value })), []);
    
  const setErrors = useCallback((value: string[] | ((prev: string[]) => string[])) => 
    setFormState(prev => ({ 
      ...prev, 
      errors: typeof value === 'function' ? value(prev.errors) : value 
    })), []);
    
  const setIsSubmitting = useCallback((value: boolean) => 
    setFormState(prev => ({ ...prev, isSubmitting: value })), []);
    
  const setShowPreview = useCallback((value: boolean) => {
    setFormState(prev => ({ ...prev, showPreview: value }));
  }, []);

  // Add effect to update preview tables when form values change
  useEffect(() => {
    const currentFloor = getCurrentFloorPlan();
    const tableCount = tablesPerFloor[currentFloor.id] || 0;
    const newPreviewTables = calculateTablePositions(currentFloor, tableCount);
    setPreviewTables(newPreviewTables);
  }, [tablesPerFloor, currentFloorIndex, automaticNumbering, startingNumber]);

  const getCurrentFloorPlan = () => {
    if (!floorPlans || floorPlans.length === 0) {
      return { id: 0, name: 'No Floor', width: 100, height: 100, floorNumber: 0 };
    }
    return floorPlans[parseInt(currentFloorIndex)] || floorPlans[0];
  };

  const calculateTablePositions = (floorPlan: FloorPlan, tableCount: number) => {
    const tables: TablePosition[] = [];
    
    if (tableCount <= 0) return tables;

    // Calculate grid layout
    const maxColumns = 3; // Fixed 3 tables per row
    const rows = Math.ceil(tableCount / maxColumns);
    const columns = Math.min(maxColumns, tableCount);

    // Calculate spacing
    const margin = 8; // % from edges
    const tableWidth = 18; // Reduced width percentage for each table
    const tableHeight = 140; // Increased height in pixels
    const horizontalGap = (100 - (2 * margin) - (columns * tableWidth)) / (columns - 1);
    const verticalGap = 40; // Vertical gap in pixels

    for (let i = 0; i < tableCount; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;

      // Calculate position as percentage for x and pixels for y
      const x = margin + (col * (tableWidth + horizontalGap)) + (tableWidth / 2);
      const y = (margin * 4) + (row * (tableHeight + verticalGap)) + (tableHeight / 2);

      tables.push({
        tableId: i + 1,
        xPosition: Math.round(x),
        yPosition: y,
        width: tableWidth,
        height: tableHeight,
        seats: 4
      });
    }
    
    return tables;
  };

  const validateTablePositions = (tables: TablePosition[], floorPlan: FloorPlan): TableErrors => {
    const errors: TableErrors = {};

    tables.forEach(table => {
      const tableErrors: string[] = [];
      
      if (table.xPosition < MIN_EDGE_DISTANCE || table.yPosition < MIN_EDGE_DISTANCE || 
          table.xPosition + table.width > floorPlan.width - MIN_EDGE_DISTANCE || 
          table.yPosition + table.height > floorPlan.height - MIN_EDGE_DISTANCE) {
        tableErrors.push("Table is too close to the floor edge");
      }

      if (tableErrors.length > 0) {
        errors[table.tableId] = tableErrors;
      }
    });

    return errors;
  };

  const handleSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      setErrors([]);

      // Create table configs for all floors, not just the current one
      const allTableConfigs: TableWithConfig[] = [];
      
      // Process each floor plan
      for (const floorPlan of floorPlans) {
        const tableCount = tablesPerFloor[floorPlan.id] || 0;
        if (tableCount > 0) {
          // Calculate positions for this floor's tables
          const positions = calculateTablePositions(floorPlan, tableCount);
          
          // Create table configs for this floor
          const floorTableConfigs = Array.from({ length: tableCount }, (_, index) => {
            const tableNumber = data.automaticNumbering ? data.startingNumber + index : index + 1;
            const position = positions[index] || { xPosition: 0, yPosition: 0, width: 4, height: 4 };
            
            return {
              tableNumber,
              floorNumber: floorPlan.floorNumber,
              qrCodeUrl: `/table/${floorPlan.floorNumber}/${tableNumber}`,
              config: {
                floorPlanId: floorPlan.id,
                xPosition: position.xPosition,
                yPosition: position.yPosition,
                width: position.width,
                height: position.height,
                shape: "rectangle",
                seats: 4,
                isActive: true
              }
            } as TableWithConfig;
          });
          
          allTableConfigs.push(...floorTableConfigs);
        }
      }

      if (allTableConfigs.length === 0) {
        throw new Error("No tables configured for any floor");
      }

      await onComplete({
        floorPlans,
        tableConfigs: allTableConfigs
      });

      setIsSubmitting(false);
      setShowPreview(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      setErrors(prev => [...prev, error instanceof Error ? error.message : "An unknown error occurred"]);
      setIsSubmitting(false);
    }
  };

  // Fetch floor plans with tables
  useEffect(() => {
    // Instead of fetching floor plans, use the ones passed as props
    if (floorPlans && floorPlans.length > 0) {
      const transformedData = floorPlans.map(plan => ({
        ...plan,
        tables: []
      }));
      setFormState(prev => ({
        ...prev,
        floorPlanDetails: transformedData,
        isLoading: false
      }));
    } else {
      setFormState(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }, [floorPlans]);

  // Update preview tables when dependencies change
  useEffect(() => {
    if (!isLoading && floorPlans && floorPlans.length > 0) {
      const currentFloor = getCurrentFloorPlan();
      const tableCount = tablesPerFloor[currentFloor.id] || 0;
      if (tableCount > 0) {
        const positions = calculateTablePositions(currentFloor, tableCount);
        setPreviewTables(positions);
        setShowPreview(true); // Show preview when table count changes
      }
    }
  }, [tablesPerFloor, currentFloorIndex, startingNumber, isLoading, floorPlans]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading floor plans...</span>
      </div>
    );
  }

  // Render no floor plans state
  if (!floorPlans || floorPlans.length === 0) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Floor Plans Found</AlertTitle>
          <AlertDescription>
          No floor plans found. Please go back and create floor plans first.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  // Main render
  return (
    <div className="space-y-6">
      <div className="prose max-w-none">
        <h3>Configure Tables for Your Restaurant</h3>
        <p>
          Specify the number of tables for each floor and how they should be numbered.
          You can adjust the table positions later in the floor plan editor.
        </p>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-2">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

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
                      <FormLabel>
                        Automatic Table Numbering
                      </FormLabel>
                      <FormDescription>
                        When enabled, tables will be automatically numbered sequentially across all floors.
                        When disabled, existing table numbers will be preserved.
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
                        <Input type="number" min={1} max={999} {...field} />
                      </FormControl>
                      <FormDescription>
                        The first table number to use when numbering tables
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
                Specify how many tables should be on each floor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={currentFloorIndex} onValueChange={setCurrentFloorIndex}>
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
                  {floorPlans.map((plan, index) => (
                    <TabsTrigger key={plan.id} value={index.toString()}>
                      {plan.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {floorPlans.map((plan, index) => (
                  <TabsContent key={plan.id} value={index.toString()}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Floor Details</h4>
                          <div className="text-sm text-muted-foreground">
                            <p>Floor Number: {plan.floorNumber}</p>
                            <p>Current Tables: {tablesPerFloor[plan.id] || 0}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Table Configuration</h4>
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
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (value > 0 && value <= 50) {
                                    field.onChange(value);
                                    // Update preview immediately when value changes
                                    const positions = calculateTablePositions(plan, value);
                                    setPreviewTables(positions);
                                    setShowPreview(true); // Show preview when table count changes
                                  }
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                                  How many tables to place on this floor (max 50)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                        </div>
                      </div>

                      {/* Table Layout Preview */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium">Table Layout Preview</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowPreview(!formShowPreview);
                              // When showing preview, update it with current values
                              if (!formShowPreview) {
                                const currentFloor = getCurrentFloorPlan();
                                const tableCount = tablesPerFloor[currentFloor.id] || 0;
                                if (tableCount > 0) {
                                  const positions = calculateTablePositions(currentFloor, tableCount);
                                  setPreviewTables(positions);
                                }
                              }
                            }}
                          >
                            {formShowPreview ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Hide Preview
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Show Preview
                              </>
                            )}
                          </Button>
                        </div>
                        {formShowPreview && (
                          <div 
                            className="relative w-full border rounded-lg overflow-hidden bg-gradient-to-br from-slate-950 to-slate-900"
                            style={{
                              height: `${Math.max(400, (Math.ceil(previewTables.length / 3) * 180) + 80)}px`
                            }}
                          >
                            {/* Grid background */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:24px_24px]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            
                            {/* Tables */}
                            {previewTables.map((table, index) => {
                              const tableNumber = automaticNumbering ? startingNumber + index : index + 1;
                              return (
                                <div
                                  key={table.tableId}
                                  className={cn(
                                    "absolute cursor-pointer transform transition-all duration-200 hover:scale-105",
                                    tableErrors[table.tableId] ? "ring-2 ring-red-500" : ""
                                  )}
                                  style={{
                                    left: `${table.xPosition}%`,
                                    top: `${table.yPosition}px`,
                                    width: `${table.width}%`,
                                    height: `${table.height}px`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                >
                                  <div className={cn(
                                    "w-4/6 h-4/6 mx-auto rounded-2xl overflow-hidden backdrop-blur-2xl border shadow-lg shadow-blue-900",
                                    "bg-gradient-to-b from-blue-600 to-blue-700",
                                    "border-blue-400/30",
                                    "flex flex-col items-center justify-center gap-1"
                                  )}>
                                    <div className="text-2xl font-semibold text-white tracking-wide font-poppins">
                                      {tableNumber}
                                    </div>
                                    <div className="text-xs font-medium text-blue-100 bg-blue-800/40 px-3 py-1 rounded-full border border-blue-400/10">
                                      {table.seats} seats
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newIndex = Math.max(0, parseInt(currentFloorIndex) - 1);
                  setCurrentFloorIndex(newIndex.toString());
                }}
                disabled={currentFloorIndex === "0"}
              >
                Previous Floor
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newIndex = Math.min(floorPlans.length - 1, parseInt(currentFloorIndex) + 1);
                  setCurrentFloorIndex(newIndex.toString());
                }}
                disabled={currentFloorIndex === (floorPlans.length - 1).toString()}
              >
                Next Floor
              </Button>
            </CardFooter>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Configuring Tables...
              </>
            ) : (
                "Save Table Configuration"
            )}
          </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default TableConfigForm;