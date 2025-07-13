import { TableConfig } from "./tables";

export interface TableConfigFormData {
  automaticNumbering: boolean;
  startingNumber: number;
  tablesPerFloor: {
    [floorPlanId: string]: number;
  };
  tableConfigs: TableConfig[];
} 