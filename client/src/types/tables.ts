import { z } from "zod";
import type { DraggableLocation } from "react-beautiful-dnd";
import type { Order } from "@shared/schema";

// Base types
export interface TablePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TableConfig {
  id: number;
  tableId: number;
  floorPlanId: number;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  shape: string;
  seats: number;
  isActive: boolean;
}

export interface TableWithPosition extends TableConfig {
  position: TablePosition;
  tableNumber?: number;
  x?: number;
  y?: number;
  config?: TableConfig;
}

export interface FloorPlan {
  id: number;
  name: string;
  floorNumber: number;
  width: number;
  height: number;
}

export interface FloorPlanDetails extends FloorPlan {
  tables: TableWithPosition[];
}

export interface FloorPlanWithTables extends FloorPlanWithPosition {
  tables: TableWithPosition[];
}

export interface Table {
  id: number;
  tableNumber: number;
  floorNumber: number;
  qrCodeUrl: string | null;
}

export interface TableWithOrder extends Table {
  x: number;
  y: number;
  width: number;
  height: number;
  order?: Order | null;
  config?: TableConfig;
}

export interface FloorPlanWithPosition extends FloorPlan {
  position?: TablePosition;
  tables?: TableWithPosition[];
}

// Form types
export interface TableConfigFormData {
  automaticNumbering: boolean;
  startingNumber: number;
  tablesPerFloor: Record<string, number>;
  tableConfigs: TableConfig[];
}

// Validation schemas
export const tableConfigSchema = z.object({
  id: z.string().optional(),
  tableId: z.number(),
  floorPlanId: z.number(),
  xPosition: z.number(),
  yPosition: z.number(),
  width: z.number(),
  height: z.number(),
  shape: z.string(),
  seats: z.number(),
  isActive: z.boolean()
});

export const tableConfigFormSchema = z.object({
  automaticNumbering: z.boolean(),
  startingNumber: z.number().min(1),
  tablesPerFloor: z.record(z.string(), z.number().min(0)),
  tableConfigs: z.array(tableConfigSchema)
});

// Error types
export type TableErrors = Record<string, string[]>;

export interface TableError {
  id: number;
  message: string;
}

// Drag and drop types
export interface DragLocation extends DraggableLocation {
  x: number;
  y: number;
}

// Helper function to transform API data to frontend types
export function transformFloorPlanData(floorPlan: FloorPlan & { tables?: (Table & { config?: TableConfig })[] }): FloorPlanWithTables {
  return {
    ...floorPlan,
    position: { x: 0, y: 0 }, // Default position
    tables: floorPlan.tables?.map(table => ({
      ...table,
      position: {
        x: table.config?.xPosition || 0,
        y: table.config?.yPosition || 0,
        width: table.config?.width || 3,
        height: table.config?.height || 3
      },
      config: table.config || {
        id: 0,
        tableId: table.id,
        floorPlanId: floorPlan.id,
        xPosition: 0,
        yPosition: 0,
        width: 3,
        height: 3,
        shape: 'rectangle',
        seats: 4,
        isActive: true
      }
    })) || []
  };
} 