import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FloorPlan, TableConfig, TableWithConfig } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FloorPlanEditorProps {
  floorPlan: FloorPlan & { tables: TableWithConfig[] };
  onTableUpdate: (table: TableConfig) => void;
  onTableAdd: () => void;
  onTableRemove: (tableId: number) => void;
}

interface TablePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const tableShapes = [
  { value: "square", label: "Square" },
  { value: "round", label: "Round" },
  { value: "booth", label: "Booth" },
] as const;

const tableSizes = [
  { value: "2", label: "2 Seats" },
  { value: "4", label: "4 Seats" },
  { value: "6", label: "6 Seats" },
  { value: "8", label: "8 Seats" },
] as const;

export function FloorPlanEditor({
  floorPlan,
  onTableUpdate,
  onTableAdd,
  onTableRemove,
}: FloorPlanEditorProps) {
  const [tablePositions, setTablePositions] = useState<Record<number, TablePosition>>({});
  const [selectedTable, setSelectedTable] = useState<TableWithConfig | null>(null);
  const [gridSize, setGridSize] = useState(20); // Size of each grid cell in pixels
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const positions: Record<number, TablePosition> = {};
    floorPlan.tables.forEach((table: TableWithConfig) => {
      positions[table.id] = {
        x: table.config.xPosition || 0,
        y: table.config.yPosition || 0,
        width: table.config.width || 3,
        height: table.config.height || 3,
      };
    });
    setTablePositions(positions);
  }, [floorPlan.tables]);

  const handleTableSelect = (table: TableWithConfig) => {
    setSelectedTable(table);
    setErrors([]); // Clear errors when selecting a table
  };

  // Check if tables overlap
  const checkTableOverlap = (tableId: number, x: number, y: number, width: number, height: number): boolean => {
    for (const [id, position] of Object.entries(tablePositions)) {
      if (parseInt(id) === tableId) continue; // Skip the current table
      
      // Check if tables overlap
      if (
        x < position.x + position.width &&
        x + width > position.x &&
        y < position.y + position.height &&
        y + height > position.y
      ) {
        return true;
      }
    }
    return false;
  };

  // Validate table position against floor boundaries
  const validateTablePosition = (x: number, y: number, width: number, height: number): string[] => {
    const errors: string[] = [];
    
    // Check if table is within floor boundaries
    if (x < 0 || y < 0 || x + width > floorPlan.width || y + height > floorPlan.height) {
      errors.push("Table is positioned outside the floor boundaries.");
    }
    
    // Check if table is too close to the edge (for service access)
    const minEdgeDistance = 2;
    if (x < minEdgeDistance || y < minEdgeDistance || 
        x + width > floorPlan.width - minEdgeDistance || 
        y + height > floorPlan.height - minEdgeDistance) {
      errors.push("Table is too close to the floor edge. Please leave space for service access.");
    }
    
    return errors;
  };

  const handleTableMove = (tableId: number, direction: 'up' | 'down' | 'left' | 'right') => {
    const table = floorPlan.tables.find((t: TableWithConfig) => t.id === tableId);
    if (!table) return;

    const currentPosition = tablePositions[tableId];
    let newX = currentPosition.x;
    let newY = currentPosition.y;

    // Move by grid size
    switch (direction) {
      case 'up':
        newY = Math.max(0, currentPosition.y - gridSize);
        break;
      case 'down':
        newY = Math.min(floorPlan.height - (currentPosition.height * gridSize), currentPosition.y + gridSize);
        break;
      case 'left':
        newX = Math.max(0, currentPosition.x - gridSize);
        break;
      case 'right':
        newX = Math.min(floorPlan.width - (currentPosition.width * gridSize), currentPosition.x + gridSize);
        break;
    }

    // Validate the new position
    const positionErrors = validateTablePosition(
      newX, 
      newY, 
      currentPosition.width, 
      currentPosition.height
    );
    
    if (positionErrors.length > 0) {
      setErrors(positionErrors);
      toast({
        title: "Invalid table position",
        description: positionErrors[0],
        variant: "destructive",
      });
      return;
    }
    
    // Check for table overlap
    if (checkTableOverlap(tableId, newX, newY, currentPosition.width, currentPosition.height)) {
      setErrors(["Table would overlap with another table. Please choose a different position."]);
      toast({
        title: "Table overlap detected",
        description: "Tables cannot overlap. Please choose a different position.",
        variant: "destructive",
      });
      return;
    }

    // Update position state
    setTablePositions((prev) => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        x: newX,
        y: newY,
      },
    }));

    // Update table config
    onTableUpdate({
      ...table.config,
      xPosition: newX,
      yPosition: newY,
    });
    
    // Clear errors if move was successful
    setErrors([]);
  };

  const handleTableAdd = () => {
    onTableAdd();
  };

  const handleTableUpdate = (tableId: number, updates: Partial<TableConfig>) => {
    const table = floorPlan.tables.find((t: TableWithConfig) => t.id === tableId);
    if (table) {
      // If position is being updated, validate it
      if (updates.xPosition !== undefined || updates.yPosition !== undefined) {
        const newX = updates.xPosition !== undefined ? updates.xPosition : table.config.xPosition;
        const newY = updates.yPosition !== undefined ? updates.yPosition : table.config.yPosition;
        const width = updates.width !== undefined ? updates.width : table.config.width;
        const height = updates.height !== undefined ? updates.height : table.config.height;
        
        const positionErrors = validateTablePosition(newX, newY, width, height);
        if (positionErrors.length > 0) {
          setErrors(positionErrors);
          toast({
            title: "Invalid table position",
            description: positionErrors[0],
            variant: "destructive",
          });
          return;
        }
        
        if (checkTableOverlap(tableId, newX, newY, width, height)) {
          setErrors(["Table would overlap with another table. Please choose a different position."]);
          toast({
            title: "Table overlap detected",
            description: "Tables cannot overlap. Please choose a different position.",
            variant: "destructive",
          });
          return;
        }
      }
      
      onTableUpdate({
        ...table.config,
        ...updates,
      });
      
      // Clear errors if update was successful
      setErrors([]);
    }
  };

  const handleTableRemove = (tableId: number) => {
    onTableRemove(tableId);
    if (selectedTable?.id === tableId) {
      setSelectedTable(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Floor Plan Editor</h3>
        <Button onClick={handleTableAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Table
        </Button>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Position Error</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-2">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="relative border rounded-lg" style={{ width: floorPlan.width, height: floorPlan.height }}>
        <div className="relative w-full h-full">
          {floorPlan.tables.map((table: TableWithConfig) => (
            <div
              key={table.id}
              className={`absolute cursor-pointer ${
                table.config.shape === "round" ? "rounded-full" : ""
              } ${
                table.config.shape === "booth" ? "rounded-t-lg" : ""
              } ${selectedTable?.id === table.id ? "ring-2 ring-primary" : ""}`}
              style={{
                left: tablePositions[table.id]?.x || 0,
                top: tablePositions[table.id]?.y || 0,
                width: (tablePositions[table.id]?.width || 3) * gridSize,
                height: (tablePositions[table.id]?.height || 3) * gridSize,
                backgroundColor: table.config.isActive
                  ? "var(--primary)"
                  : "var(--muted)",
              }}
              onClick={() => handleTableSelect(table)}
            >
              <div className="flex items-center justify-center h-full text-white text-sm">
                {table.config.seats} seats
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedTable && (
        <Card>
          <CardHeader>
            <CardTitle>Table Configuration</CardTitle>
            <CardDescription>Configure table properties</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shape">Shape</Label>
              <Select
                value={selectedTable.config.shape}
                onValueChange={(value) =>
                  handleTableUpdate(selectedTable.id, { shape: value as TableConfig["shape"] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shape" />
                </SelectTrigger>
                <SelectContent>
                  {tableShapes.map((shape) => (
                    <SelectItem key={shape.value} value={shape.value}>
                      {shape.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seats">Seats</Label>
              <Select
                value={selectedTable.config.seats.toString()}
                onValueChange={(value) =>
                  handleTableUpdate(selectedTable.id, { seats: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select seats" />
                </SelectTrigger>
                <SelectContent>
                  {tableSizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="width">Width (units)</Label>
              <Input
                id="width"
                type="number"
                min={1}
                max={10}
                value={selectedTable.config.width}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= 10) {
                    handleTableUpdate(selectedTable.id, { width: value });
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">Height (units)</Label>
              <Input
                id="height"
                type="number"
                min={1}
                max={10}
                value={selectedTable.config.height}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= 10) {
                    handleTableUpdate(selectedTable.id, { height: value });
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Position</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-start-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleTableMove(selectedTable.id, 'up')}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </div>
                <div className="col-start-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleTableMove(selectedTable.id, 'left')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
                <div className="col-start-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleTableMove(selectedTable.id, 'down')}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                <div className="col-start-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleTableMove(selectedTable.id, 'right')}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleTableRemove(selectedTable.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Table
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 