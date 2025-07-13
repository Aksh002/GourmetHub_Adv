import { z } from "zod";
import type { DraggableLocation } from "react-beautiful-dnd";
import { type Order } from "./order-types";

// Base types
export interface TablePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloorPlan {
  id: number;
  name: string;
  floorNumber: number;
  width: number;
  height: number;
  restaurantId: number;
}

export interface TableConfig {
  id: number;
  tableId: number;
  floorPlanId: number;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  shape: "rectangle" | "circle";
  seats: number;
  isActive: boolean;
}

// Main table types
export interface TableBase {
  id: number;
  tableNumber: number;
  floorNumber: number;
  qrCodeUrl?: string;
  restaurantId: number;
  status: "available" | "occupied" | "reserved";
}

export interface TableWithConfig extends TableBase {
  config: TableConfig;
  position: TablePosition;
  order?: Order;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  restaurantId: number;
  available: boolean;
  price: number;
  category: string;
  imageUrl: string | null;
  tags: string[] | null;
}

export interface OrderItem {
  id: number;
  orderId: number;
  menuItemId: number;
  restaurantId: number;
  quantity: number;
  price: number;
  menuItem: MenuItem;
}

export interface TableWithOrder extends TableBase {
  config: TableConfig;
  position: TablePosition;
  order?: Order | null;
  restaurantId: number;
}

export interface FloorPlanDetails {
  id: number;
  name: string;
  floorNumber: number;
  imageUrl: string;
  tables: (TableBase & { config?: TableConfig })[];
}

export interface FloorPlanWithPosition extends FloorPlan {
  position: {
    x: number;
    y: number;
  };
}

export interface FloorPlanWithTables extends FloorPlan {
  tables: TableWithConfig[];
}

// Form types
export interface TableConfigFormData {
  automaticNumbering: boolean;
  startingNumber: number;
  tablesPerFloor: Record<string, number>;
  tableConfigs: TableConfig[];
}

// Form state
export interface TableConfigFormState {
  isSubmitting: boolean;
  showPreview: boolean;
  currentFloorIndex: string;
  floorPlanDetails: FloorPlanDetails[];
  previewTables: TableWithConfig[];
  tableErrors: TableErrors;
  isLoading: boolean;
  errors: string[];
}

// Validation schemas
export const tableConfigSchema = z.object({
  id: z.number().optional(),
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
export function transformFloorPlanData(data: any): FloorPlanWithTables {
  return {
    id: data.id,
    name: data.name || `Floor ${data.floorNumber}`,
    floorNumber: data.floorNumber,
    width: data.width || 800,
    height: data.height || 600,
    restaurantId: data.restaurantId,
    tables: data.tables.map((table: any) => ({
      id: table.id,
      tableNumber: table.tableNumber,
      floorNumber: data.floorNumber,
      qrCodeUrl: table.qrCodeUrl,
      restaurantId: data.restaurantId,
      status: table.status || "available",
      config: {
        ...table.config,
        seats: table.config?.seats || 4,
        width: table.config?.width || 100,
        height: table.config?.height || 100,
        shape: table.config?.shape || "rectangle"
      },
      position: {
        x: table.config?.xPosition || 0,
        y: table.config?.yPosition || 0,
        width: table.config?.width || 100,
        height: table.config?.height || 100
      },
      order: table.order || null
    }))
  };
}

export interface TableConfigInput {
  id?: number;
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