import { Router } from "express";
import { db } from "../../db";
import { floorPlans, tables, tableConfigs, type FloorPlan, type Table, type TableConfig } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

interface TableWithOrderAndConfig extends Table {
  config: TableConfig;
  order?: any; // TODO: Add proper order type
}

interface FloorPlanWithTablesResponse extends FloorPlan {
  tables: TableWithOrderAndConfig[];
}

interface FloorPlanWithConfigs extends FloorPlan {
  tableConfigs: (TableConfig & {
    table: Table & {
      order?: any;
    };
  })[];
}

// Get all floor plans with tables
router.get("/with-tables", async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ error: "Restaurant ID is required" });
    }

    console.log("Fetching floor plans for restaurant:", restaurantId);

    // First get all floor plans for the restaurant
    const plans = await db.query.floorPlans.findMany({
      where: eq(floorPlans.restaurantId, parseInt(restaurantId as string)),
      with: {
        tableConfigs: {
          with: {
            table: {
              with: {
                order: {
                  with: {
                    items: {
                      with: {
                        menuItem: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }) as FloorPlanWithConfigs[];

    console.log("Found floor plans:", plans);

    // Transform the data to match our frontend types
    const plansWithTables = plans.map(plan => {
      const tables = plan.tableConfigs
        .filter(config => config.table && config.table.restaurantId === parseInt(restaurantId as string))
        .map(config => ({
          id: config.table!.id,
          tableNumber: config.table!.tableNumber,
          floorNumber: plan.floorNumber,
          restaurantId: parseInt(restaurantId as string),
          status: config.table!.status || "available",
          qrCodeUrl: config.table!.qrCodeUrl || `/table/${plan.id}/${config.table!.tableNumber}`,
          config: {
            ...config,
            seats: config.seats || 4,
            width: config.width || 100,
            height: config.height || 100,
            shape: config.shape || "rectangle"
          },
          order: config.table!.order
        }));

      return {
        id: plan.id,
        name: plan.name || `Floor ${plan.floorNumber}`,
        floorNumber: plan.floorNumber,
        width: plan.width || 800,
        height: plan.height || 600,
        tables
      };
    });

    console.log("Final response:", plansWithTables);
    res.json(plansWithTables);
  } catch (error) {
    console.error("Failed to fetch floor plans:", error);
    res.status(500).json({ 
      error: "Failed to fetch floor plans",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router; 