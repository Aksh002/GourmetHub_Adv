import { FloorPlan, TableConfig, TablePosition, TableWithPosition, FloorPlanWithTables } from "@/types/tables";

export function transformFloorPlanData(data: any): FloorPlanWithTables {
  const tables = data.tables?.map((table: any) => ({
    id: table.id,
    tableNumber: table.tableNumber,
    floorNumber: table.floorNumber,
    qrCodeUrl: table.qrCodeUrl,
    config: {
      id: table.config?.id,
      tableId: table.id,
      floorPlanId: data.id,
      xPosition: table.config?.xPosition ?? 0,
      yPosition: table.config?.yPosition ?? 0,
      width: table.config?.width ?? 100,
      height: table.config?.height ?? 100,
      shape: table.config?.shape ?? 'rectangle',
      seats: table.config?.seats ?? 4,
      isActive: table.config?.isActive ?? true
    },
    position: {
      x: table.config?.xPosition ?? 0,
      y: table.config?.yPosition ?? 0,
      width: table.config?.width ?? 100,
      height: table.config?.height ?? 100
    }
  })) ?? [];

  return {
    id: data.id,
    name: data.name,
    width: data.width,
    height: data.height,
    restaurantId: data.restaurantId,
    tables
  };
} 