import { Router } from "express";
import { db } from "../../db";
import { tables, tableConfigs, floorPlans, type Table, type TableConfig, type FloorPlan } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import QRCode from "qrcode";

const router = Router();

// Helper function to generate QR code URL
async function generateQRCodeUrl(tableId: number, restaurantId: number): Promise<string> {
  const qrData = `/table/${tableId}/${restaurantId}`;
  try {
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    return qrCodeDataUrl;
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    return qrData; // Return the raw URL if QR generation fails
  }
}

// Get all tables with their orders
router.get("/with-orders", async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ error: "Restaurant ID is required" });
    }

    const tablesWithOrders = await db.query.tables.findMany({
      where: eq(tables.restaurantId, parseInt(restaurantId as string)),
      with: {
        order: {
          with: {
            items: {
              with: {
                menuItem: true
              }
            }
          }
        },
        config: true
      }
    });
    
    res.json(tablesWithOrders);
  } catch (error) {
    console.error("Failed to fetch tables with orders:", error);
    res.status(500).json({ error: "Failed to fetch tables" });
  }
});

// Create a new table
router.post("/", async (req, res) => {
  try {
    const { tableNumber, floorNumber, restaurantId } = req.body as {
      tableNumber: number;
      floorNumber: number;
      restaurantId: number;
    };

    // Generate QR code URL
    const qrCodeUrl = await generateQRCodeUrl(tableNumber, restaurantId);

    // Create the table with QR code URL
    const newTable = await db.insert(tables).values({
      tableNumber,
      floorNumber,
      restaurantId,
      qrCodeUrl,
      status: "available"
    }).returning();

    res.status(201).json(newTable[0]);
  } catch (error) {
    console.error("Failed to create table:", error);
    res.status(500).json({ error: "Failed to create table" });
  }
});

// Update a table
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { floorNumber, tableNumber, restaurantId } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ error: "Restaurant ID is required" });
    }

    // Check if table exists
    const existingTable = await db.query.tables.findFirst({
      where: eq(tables.id, parseInt(id))
    });

    if (!existingTable) {
      return res.status(404).json({ error: "Table not found" });
    }

    // Update the table
    await db.update(tables)
      .set({
        tableNumber,
        floorNumber
      })
      .where(eq(tables.id, parseInt(id)));

    // Get the updated table with its config
    const updatedTable = await db.query.tables.findFirst({
      where: eq(tables.id, parseInt(id)),
      with: {
        config: true
      }
    });

    res.json(updatedTable);
  } catch (error) {
    console.error("Failed to update table:", error);
    res.status(500).json({ error: "Failed to update table" });
  }
});

// Reserve/unreserve a table
router.post("/:id/reserve", async (req, res) => {
  try {
    const { id } = req.params;
    const { isReserved, reservationTime } = req.body;
    
    // Update the table's reservation status
    await db.update(tables)
      .set({
        isReserved,
        reservationTime: isReserved ? new Date(reservationTime) : null
      })
      .where(eq(tables.id, parseInt(id)));
    
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update table reservation:", error);
    res.status(500).json({ error: "Failed to update table reservation" });
  }
});

// Update table configuration
router.put("/:id/config", async (req, res) => {
  try {
    const { id } = req.params;
    const { xPosition, yPosition, width, height, shape, seats, isActive } = req.body;
    
    // Update or create table configuration
    const existingConfig = await db.query.tableConfigs.findFirst({
      where: eq(tableConfigs.tableId, parseInt(id))
    });
    
    if (existingConfig) {
      await db.update(tableConfigs)
        .set({
          xPosition,
          yPosition,
          width,
          height,
          shape,
          seats,
          isActive
        })
        .where(eq(tableConfigs.tableId, parseInt(id)));
    } else {
      await db.insert(tableConfigs).values({
        tableId: parseInt(id),
        xPosition,
        yPosition,
        width,
        height,
        shape,
        seats,
        isActive
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update table configuration:", error);
    res.status(500).json({ error: "Failed to update table configuration" });
  }
});

export default router; 