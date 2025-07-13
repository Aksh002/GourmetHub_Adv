import { users, tables, menuItems, orders, orderItems, payments, 
  restaurants, operatingHours, floorPlans, tableConfigs,
  type User, type InsertUser, type Table, type InsertTable, 
  type MenuItem, type InsertMenuItem, type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem, type Payment, type InsertPayment, 
  type OrderWithItems, type TableWithOrder, type Restaurant, type InsertRestaurant,
  type OperatingHours, type InsertOperatingHours, type FloorPlan, type InsertFloorPlan,
  type TableConfig, type InsertTableConfig, type FloorPlanWithTables,
  type RestaurantWithDetails, type TableWithConfig } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import { db } from './db';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '@shared/schema';

type TableStatus = "available" | "reserved" | "occupied";

type TableWithOrderResult = {
  tableData: typeof schema.tables.$inferSelect;
  orderData: typeof schema.orders.$inferSelect | null;
  configData: typeof schema.tableConfigs.$inferSelect | null;
};

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: number, newPassword: string): Promise<User | undefined>;
  
  // Table methods
  getTable(id: number): Promise<Table | undefined>;
  getTables(restaurantId: number): Promise<TableWithOrder[]>;
  getTablesByFloor(restaurantId: number, floorNumber: number): Promise<TableWithOrder[]>;
  createTable(restaurantId: number, table: { tableNumber: number; floorNumber: number; qrCodeUrl?: string | null; status?: TableStatus }): Promise<Table>;
  getTableWithOrder(id: number): Promise<TableWithOrder | undefined>;
  getAllTablesWithOrders(): Promise<TableWithOrder[]>;
  
  // Menu methods
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  getMenuItems(restaurantId: number, categoryFilter?: string): Promise<MenuItem[]>;
  createMenuItem(restaurantId: number, menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, menuItem: Partial<MenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getOrders(restaurantId: number): Promise<Order[]>;
  createOrder(restaurantId: number, order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: Order["status"]): Promise<Order | undefined>;
  getOrdersWithItems(restaurantId: number): Promise<OrderWithItems[]>;
  getOrderWithItems(id: number): Promise<OrderWithItems | undefined>;
  getOrdersByStatus(restaurantId: number, status: Order["status"]): Promise<OrderWithItems[]>;
  getActiveOrderForTable(tableId: number): Promise<OrderWithItems | undefined>;
  getActiveOrdersForTables(tableIds: number[], restaurantId: number): Promise<Map<string, OrderWithItems>>;
  
  // Order item methods
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  
  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByOrderId(orderId: number): Promise<Payment | undefined>;
  updatePaymentStatus(id: number, status: string): Promise<Payment | undefined>;

  // Restaurant Setup methods
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getDefaultRestaurant(): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: number, restaurant: Partial<Restaurant>): Promise<Restaurant | undefined>;
  getRestaurantWithDetails(id: number): Promise<RestaurantWithDetails | undefined>;
  getRestaurantByAdmin(userId: number): Promise<Restaurant | undefined>;
  
  // Operating Hours methods
  getOperatingHours(id: number): Promise<OperatingHours | undefined>;
  getOperatingHoursByRestaurant(restaurantId: number): Promise<OperatingHours[]>;
  createOperatingHours(hours: InsertOperatingHours): Promise<OperatingHours>;
  updateOperatingHours(id: number, hours: Partial<OperatingHours>): Promise<OperatingHours | undefined>;
  deleteOperatingHours(id: number): Promise<boolean>;
  
  // Floor Plan methods
  getFloorPlan(id: number): Promise<FloorPlan | undefined>;
  getFloorPlansByRestaurant(restaurantId: number): Promise<FloorPlan[]>;
  getAllFloorPlans(): Promise<FloorPlan[]>;
  createFloorPlan(floorPlan: InsertFloorPlan): Promise<FloorPlan>;
  updateFloorPlan(id: number, floorPlan: Partial<FloorPlan>): Promise<FloorPlan | undefined>;
  deleteFloorPlan(id: number): Promise<boolean>;
  getFloorPlanWithTables(id: number): Promise<FloorPlanWithTables | undefined>;
  
  // Table Config methods
  getTableConfig(id: number): Promise<TableConfig | undefined>;
  getTableConfigByTable(tableId: number): Promise<TableConfig | undefined>;
  getTableConfigsByFloorPlan(floorPlanId: number): Promise<TableConfig[]>;
  createTableConfig(tableConfig: InsertTableConfig): Promise<TableConfig>;
  updateTableConfig(id: number, data: Partial<TableConfig>): Promise<TableConfig>;
  deleteTableConfig(id: number): Promise<boolean>;
  getTableWithConfig(tableId: number): Promise<TableWithConfig | undefined>;

  // Session store
  sessionStore: session.Store;

  // New methods
  updateTableReservation(id: number, reserved: boolean): Promise<Table | undefined>;
  reserveTable(tableId: number): Promise<void>;
  unreserveTable(tableId: number): Promise<void>;

  deleteAllTables(): Promise<void>;

  createDefaultTablesForFloorPlan(floorPlanId: number, floorNumber: number, restaurantId: number): Promise<void>;
}

export class PostgresStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Setup session store (still using memory store for sessions)
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id)
    });
    return result;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    return result;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }
  
  async updateUserPassword(id: number, newPassword: string): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ password: newPassword })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Table methods
  async getTable(id: number): Promise<Table | undefined> {
    try {
      const result = await db.select().from(tables).where(eq(tables.id, id));
      return result[0];
    } catch (error) {
      console.error(`Error fetching table ${id}:`, error);
      return undefined;
    }
  }

  async getTables(restaurantId: number): Promise<TableWithOrder[]> {
    try {
      const result = await db.select({
        table: tables,
        config: tableConfigs,
        order: orders
      })
      .from(tables)
      .leftJoin(tableConfigs, eq(tables.id, tableConfigs.tableId))
      .leftJoin(orders, and(
        eq(tables.id, orders.tableId),
        eq(orders.status, 'active')
      ))
      .where(eq(tables.restaurantId, restaurantId));

      return result.map(row => ({
        id: row.table.id,
        tableNumber: row.table.tableNumber,
        floorNumber: row.table.floorNumber,
        qrCodeUrl: row.table.qrCodeUrl,
        restaurantId: row.table.restaurantId,
        status: row.table.status,
        config: row.config || {
          id: 0,
          tableId: row.table.id,
          floorPlanId: 0,
          xPosition: 0,
          yPosition: 0,
          width: 3,
          height: 3,
          shape: 'rectangle' as const,
          seats: 4,
          isActive: true
        },
        order: row.order ? {
          id: row.order.id,
          tableId: row.order.tableId,
          restaurantId: row.order.restaurantId,
          userId: row.order.userId,
          status: row.order.status,
          createdAt: row.order.createdAt,
          items: []
        } : null
      }));
    } catch (error) {
      console.error("Error fetching tables:", error);
      throw error;
    }
  }

  async getTablesByFloor(restaurantId: number, floorNumber: number): Promise<TableWithOrder[]> {
    try {
      const result = await db.select({
        table: tables,
        config: tableConfigs,
        order: orders
      })
      .from(tables)
      .leftJoin(tableConfigs, eq(tables.id, tableConfigs.tableId))
      .leftJoin(orders, and(
        eq(tables.id, orders.tableId),
        eq(orders.status, 'active')
      ))
      .where(and(
        eq(tables.restaurantId, restaurantId),
        eq(tables.floorNumber, floorNumber)
      ));

      return result.map(row => ({
        id: row.table.id,
        tableNumber: row.table.tableNumber,
        floorNumber: row.table.floorNumber,
        qrCodeUrl: row.table.qrCodeUrl,
        restaurantId: row.table.restaurantId,
        status: row.table.status,
        config: row.config || {
          id: 0,
          tableId: row.table.id,
          floorPlanId: 0,
          xPosition: 0,
          yPosition: 0,
          width: 3,
          height: 3,
          shape: 'rectangle' as const,
          seats: 4,
          isActive: true
        },
        order: row.order ? {
          id: row.order.id,
          tableId: row.order.tableId,
          restaurantId: row.order.restaurantId,
          userId: row.order.userId,
          status: row.order.status,
          createdAt: row.order.createdAt,
          items: []
        } : null
      }));
    } catch (error) {
      console.error("Error fetching tables by floor:", error);
      throw error;
    }
  }

  async createTable(restaurantId: number, table: { tableNumber: number; floorNumber: number; qrCodeUrl?: string | null; status?: TableStatus }): Promise<Table> {
    try {
      console.log("[DEBUG] Creating table with data:", table);
      const result = await db.insert(tables)
        .values({
          restaurantId,
          tableNumber: table.tableNumber,
          floorNumber: table.floorNumber,
          qrCodeUrl: table.qrCodeUrl,
          status: table.status || "available"
        })
        .returning();
      
      if (!result[0]) {
        throw new Error("Failed to create table: No result returned");
      }
      
      console.log("[DEBUG] Created table:", result[0]);
      return result[0];
    } catch (error) {
      console.error("[ERROR] Error creating table:", error);
      throw error;
    }
  }

  async getTableWithOrder(id: number): Promise<TableWithOrder | undefined> {
    try {
      const result = await db.select({
        tableData: {
          id: tables.id,
          tableNumber: tables.tableNumber,
          floorNumber: tables.floorNumber,
          qrCodeUrl: tables.qrCodeUrl,
          restaurantId: tables.restaurantId,
          status: tables.status,
        },
        configData: {
          id: tableConfigs.id,
          tableId: tableConfigs.tableId,
          width: tableConfigs.width,
          height: tableConfigs.height,
          isActive: tableConfigs.isActive,
          floorPlanId: tableConfigs.floorPlanId,
          xPosition: tableConfigs.xPosition,
          yPosition: tableConfigs.yPosition,
          shape: tableConfigs.shape,
          seats: tableConfigs.seats,
        },
        orderData: {
          id: orders.id,
          tableId: orders.tableId,
          userId: orders.userId,
          restaurantId: orders.restaurantId,
          status: orders.status,
          createdAt: orders.createdAt,
        }
      })
      .from(tables)
      .leftJoin(tableConfigs, eq(tables.id, tableConfigs.tableId))
      .leftJoin(orders, and(
        eq(tables.id, orders.tableId),
        eq(orders.status, 'placed')
      ))
      .where(eq(tables.id, id));

      if (!result.length) return undefined;

      const { tableData, configData, orderData } = result[0];
      let orderWithItems: OrderWithItems | null = null;

      if (orderData?.id) {
        // Fetch order items with menu items for this order
        const items = await db.select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          menuItemId: orderItems.menuItemId,
          quantity: orderItems.quantity,
          restaurantId: orderItems.restaurantId,
          price: orderItems.price,
          menuItem: {
            id: menuItems.id,
            name: menuItems.name,
            description: menuItems.description,
            price: menuItems.price,
            category: menuItems.category,
            restaurantId: menuItems.restaurantId,
            available: menuItems.available,
            imageUrl: menuItems.imageUrl,
            tags: menuItems.tags,
          }
        })
        .from(orderItems)
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, orderData.id));

        orderWithItems = {
          ...orderData,
          items
        };
      }

      // Construct the final TableWithOrder object
      const tableWithOrder: TableWithOrder = {
        ...tableData,
        config: configData?.id ? configData : undefined,
        order: orderWithItems,
        position: configData ? {
          x: configData.xPosition,
          y: configData.yPosition,
          width: configData.width,
          height: configData.height
        } : undefined
      };

      return tableWithOrder;
    } catch (error) {
      console.error('Error in getTableWithOrder:', error);
      throw error;
    }
  }

  async getAllTablesWithOrders(): Promise<TableWithOrder[]> {
    const allTables = await db.query.tables.findMany({
      with: {
        order: true
      }
    });

    return allTables.map(table => ({
      ...table,
      config: {
        id: 0,
        tableId: table.id,
        width: 4,
        height: 4,
        isActive: true,
        floorPlanId: table.floorNumber,
        xPosition: 0,
        yPosition: 0,
        shape: 'rectangle',
        seats: 4
      }
    }));
  }

  // Menu item methods
  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const result = await db.query.menuItems.findFirst({
      where: eq(menuItems.id, id)
    });
    return result;
  }

  async getMenuItems(restaurantId: number, categoryFilter?: string): Promise<MenuItem[]> {
    const query = categoryFilter
      ? and(eq(menuItems.restaurantId, restaurantId), eq(menuItems.category, categoryFilter))
      : eq(menuItems.restaurantId, restaurantId);

    const result = await db.query.menuItems.findMany({
      where: query
    });
    return result;
  }

  async createMenuItem(restaurantId: number, menuItem: InsertMenuItem): Promise<MenuItem> {
    console.log("Creating menu item:", menuItem);
    const result = await db.insert(menuItems).values({
      restaurantId,
      ...menuItem
    }).returning();
    console.log("Created menu item:", result[0]);
    return result[0];
  }

  async updateMenuItem(id: number, menuItemUpdates: Partial<MenuItem>): Promise<MenuItem | undefined> {
    console.log("Updating menu item:", id, menuItemUpdates);
    const menuItem = await this.getMenuItem(id);
    if (!menuItem) {
      console.log("Menu item not found:", id);
      return undefined;
    }

    const result = await db.update(menuItems)
      .set(menuItemUpdates)
      .where(eq(menuItems.id, id))
      .returning();
    console.log("Updated menu item:", result[0]);
    return result[0];
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    console.log("Deleting menu item:", id);
    const result = await db.delete(menuItems)
      .where(eq(menuItems.id, id))
      .returning();
    console.log("Delete result:", result);
    return result.length > 0;
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    const result = await db.query.orders.findFirst({
      where: eq(orders.id, id)
    });
    return result;
  }

  async getOrders(restaurantId: number): Promise<Order[]> {
    const result = await db.query.orders.findMany({
      where: eq(orders.restaurantId, restaurantId)
    });
    return result;
  }

  async createOrder(restaurantId: number, order: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values({
      restaurantId,
      ...order
    }).returning();
    return result[0];
  }

  async updateOrderStatus(id: number, status: Order["status"]): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order) return undefined;

    const result = await db.update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return result[0];
  }

  async getOrdersWithItems(restaurantId: number): Promise<OrderWithItems[]> {
    try {
      console.log("[DEBUG] getOrdersWithItems - Starting query for restaurant:", restaurantId);
      
      // First get all orders for the restaurant
      const ordersResult = await db
        .select({
          order: orders,
          items: orderItems,
          menuItem: menuItems,
        })
        .from(orders)
        .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
        .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orders.restaurantId, restaurantId));

      console.log("[DEBUG] getOrdersWithItems - Retrieved", ordersResult.length, "raw rows");

      // If no orders found, return empty array
      if (ordersResult.length === 0) {
        console.log("[DEBUG] getOrdersWithItems - No orders found");
        return [];
      }

      // Group items by order ID
      const ordersMap = new Map<number, OrderWithItems>();

      for (const row of ordersResult) {
        if (!row.order?.id) {
          console.log("[DEBUG] getOrdersWithItems - Skipping row with no order ID");
          continue;
        }

        let orderWithItems = ordersMap.get(row.order.id);
        if (!orderWithItems) {
          orderWithItems = {
            ...row.order,
            items: [],
          };
          ordersMap.set(row.order.id, orderWithItems);
        }

        // Only add items if they exist and have a menu item
        if (row.items && row.menuItem) {
          const orderItem: OrderItem = {
            id: row.items.id,
            orderId: row.items.orderId,
            menuItemId: row.items.menuItemId,
            quantity: row.items.quantity,
            price: row.items.price,
            restaurantId: row.items.restaurantId,
            menuItem: row.menuItem
          };
          orderWithItems.items.push(orderItem);
        }
      }

      const result = Array.from(ordersMap.values());
      console.log("[DEBUG] getOrdersWithItems - Returning", result.length, "orders");
      return result;
    } catch (error) {
      console.error("[ERROR] getOrdersWithItems failed:", error);
      throw new Error(`Failed to fetch orders with items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrderWithItems(id: number): Promise<OrderWithItems | undefined> {
    const order = await this.getOrder(id);
    if (!order) return undefined;

    const orderItems = await this.getOrderItems(order.id);
    const itemsWithMenuItems = await Promise.all(
      orderItems.map(async (item) => {
        const menuItem = await this.getMenuItem(item.menuItemId);
        return { ...item, menuItem: menuItem! };
      })
    );

    return { ...order, items: itemsWithMenuItems };
  }

  async getOrdersByStatus(restaurantId: number, status: Order["status"]): Promise<OrderWithItems[]> {
    try {
      console.log("[DEBUG] getOrdersByStatus - Starting query for restaurant:", restaurantId, "status:", status);
      
      const ordersResult = await db
        .select({
          order: orders,
          items: orderItems,
          menuItem: menuItems,
        })
        .from(orders)
        .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
        .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(and(
          eq(orders.restaurantId, restaurantId),
          eq(orders.status, status)
        ));

      console.log("[DEBUG] getOrdersByStatus - Retrieved", ordersResult.length, "raw rows");

      // Group items by order ID
      const ordersMap = new Map<number, OrderWithItems>();

      for (const row of ordersResult) {
        if (!row.order?.id) {
          console.log("[DEBUG] getOrdersByStatus - Skipping row with no order ID");
          continue;
        }

        let orderWithItems = ordersMap.get(row.order.id);
        if (!orderWithItems) {
          orderWithItems = {
            ...row.order,
            items: [],
          };
          ordersMap.set(row.order.id, orderWithItems);
        }

        // Only add items if they exist and have a menu item
        if (row.items && row.menuItem) {
          const orderItem: OrderItem = {
            id: row.items.id,
            orderId: row.items.orderId,
            menuItemId: row.items.menuItemId,
            quantity: row.items.quantity,
            price: row.items.price,
            restaurantId: row.items.restaurantId,
            menuItem: row.menuItem
          };
          orderWithItems.items.push(orderItem);
        }
      }

      const result = Array.from(ordersMap.values());
      console.log("[DEBUG] getOrdersByStatus - Returning", result.length, "orders");
      return result;
    } catch (error) {
      console.error("[ERROR] getOrdersByStatus failed:", error);
      throw new Error(`Failed to fetch orders by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getActiveOrderForTable(tableId: number): Promise<OrderWithItems | undefined> {
    const activeStatuses = ["placed", "under_process", "served", "completed"];
    const orders = await this.getOrdersWithItems(0);
    const activeOrders = orders.filter(
      order => order.tableId === tableId && activeStatuses.includes(order.status)
    );
    
    // Return the most recent active order
    return activeOrders.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
  }

  // Order item methods
  async createOrderItem(insertOrderItem: InsertOrderItem): Promise<OrderItem> {
    const result = await db.insert(orderItems).values(insertOrderItem).returning();
    return result[0];
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId)
    });
  }

  // Payment methods
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values(insertPayment).returning();
    return result[0];
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const result = await db.query.payments.findFirst({
      where: eq(payments.id, id)
    });
    return result;
  }

  async getPaymentByOrderId(orderId: number): Promise<Payment | undefined> {
    const result = await db.query.payments.findFirst({
      where: eq(payments.orderId, orderId)
    });
    return result;
  }

  async updatePaymentStatus(id: number, status: string): Promise<Payment | undefined> {
    const payment = await this.getPayment(id);
    if (!payment) return undefined;

    const result = await db.update(payments)
      .set({ status })
      .where(eq(payments.id, id))
      .returning();
    return result[0];
  }

  // Restaurant Setup methods
  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    const result = await db.query.restaurants.findFirst({
      where: eq(restaurants.id, id)
    });
    return result;
  }

  async getDefaultRestaurant(): Promise<Restaurant | undefined> {
    const result = await db.query.restaurants.findFirst();
    return result;
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const result = await db.insert(restaurants).values(restaurant).returning();
    const newRestaurant = result[0];
    
    // Create default menu items for each category
    await this.createDefaultMenuItems(newRestaurant.id);
    
    return newRestaurant;
  }

  private async createDefaultMenuItems(restaurantId: number): Promise<void> {
    const defaultItems = [
      {
        name: "Classic Caesar Salad",
        description: "Fresh romaine lettuce with Caesar dressing, croutons, and parmesan",
        price: 899, // $8.99
        category: "starters",
        available: true
      },
      {
        name: "Grilled Salmon",
        description: "Fresh Atlantic salmon with seasonal vegetables",
        price: 2499, // $24.99
        category: "main_course",
        available: true
      },
      {
        name: "Chocolate Lava Cake",
        description: "Warm chocolate cake with a molten center, served with vanilla ice cream",
        price: 799, // $7.99
        category: "desserts",
        available: true
      },
      {
        name: "Signature Mojito",
        description: "Fresh mint, lime, and premium rum",
        price: 899, // $8.99
        category: "beverages",
        available: true
      },
      {
        name: "Chef's Special",
        description: "Daily curated dish showcasing seasonal ingredients",
        price: 2999, // $29.99
        category: "specials",
        available: true
      }
    ];

    for (const item of defaultItems) {
      await this.createMenuItem(restaurantId, item);
    }
  }

  async updateRestaurant(id: number, restaurantUpdates: Partial<Restaurant>): Promise<Restaurant | undefined> {
    console.log("[DEBUG] Updating restaurant with ID:", id);
    console.log("[DEBUG] Update data:", restaurantUpdates);
    
    const result = await db.update(restaurants)
      .set(restaurantUpdates)
      .where(eq(restaurants.id, id))
      .returning();
    
    console.log("[DEBUG] Update result:", result[0]);
    return result[0];
  }

  async getRestaurantWithDetails(id: number): Promise<RestaurantWithDetails | undefined> {
    try {
      console.log(`[DEBUG] Starting getRestaurantWithDetails for ID: ${id}`);
      const restaurant = await this.getRestaurant(id);
      if (!restaurant) {
        console.log(`[ERROR] Restaurant with ID ${id} not found in database`);
        return undefined;
      }
      console.log(`[DEBUG] Found restaurant: ${JSON.stringify(restaurant)}`);

      console.log(`[DEBUG] Fetching operating hours and floor plans for restaurant ${id}`);
      const [operatingHours, floorPlans] = await Promise.all([
        this.getOperatingHoursByRestaurant(id),
        this.getFloorPlansByRestaurant(id)
      ]);
      console.log(`[DEBUG] Found ${operatingHours.length} operating hours and ${floorPlans.length} floor plans`);

      // Check if we need to create default tables for any floor plans
      for (const plan of floorPlans) {
        const existingTables = await db.select()
          .from(tables)
          .where(and(
            eq(tables.restaurantId, id),
            eq(tables.floorNumber, plan.floorNumber)
          ));

        if (existingTables.length === 0) {
          console.log(`[DEBUG] No tables found for floor plan ${plan.id}, creating default tables`);
          await this.createDefaultTablesForFloorPlan(plan.id, plan.floorNumber, id);
        }
      }

      console.log(`[DEBUG] Processing floor plans for restaurant ${id}`);
      const floorPlansWithTables = await Promise.all(
        floorPlans.map(async plan => {
          try {
            console.log(`[DEBUG] Processing floor plan ${plan.id}`);
            
            // Get all tables for this floor with their configurations
            const tableRows = await db.select({
              table: tables,
              config: tableConfigs
            })
            .from(tables)
            .leftJoin(tableConfigs, eq(tables.id, tableConfigs.tableId))
            .where(and(
              eq(tables.restaurantId, id),
              eq(tables.floorNumber, plan.floorNumber)
            ));

            console.log(`[DEBUG] Found ${tableRows.length} tables for floor plan ${plan.id}`);

            // Get active orders for these tables
            const tableIds = tableRows.map(row => row.table.id);
            const ordersMap = await this.getActiveOrdersForTables(tableIds, id);

            // Map tables with their orders and configurations
            const tablesWithOrders = tableRows.map(row => ({
              ...row.table,
              config: row.config || {
                id: 0,
                tableId: row.table.id,
                floorPlanId: plan.id,
                xPosition: 0,
                yPosition: 0,
                width: 3,
                height: 3,
                shape: 'rectangle' as const,
                seats: 4,
                isActive: true
              },
              order: ordersMap.get(row.table.id.toString()) || null,
              position: row.config ? {
                x: row.config.xPosition,
                y: row.config.yPosition,
                width: row.config.width,
                height: row.config.height
              } : undefined
            }));

            return {
              ...plan,
              tables: tablesWithOrders
            };
          } catch (error) {
            console.error(`[ERROR] Error processing floor plan ${plan.id}:`, error);
            return {
              ...plan,
              tables: []
            };
          }
        })
      );

      console.log(`[DEBUG] Successfully processed all floor plans`);
      
      return {
        ...restaurant,
        operatingHours,
        floorPlans: floorPlansWithTables
      };
    } catch (error) {
      console.error(`[ERROR] Error in getRestaurantWithDetails:`, error);
      return undefined;
    }
  }

  async getActiveOrdersForTables(tableIds: number[], restaurantId: number): Promise<Map<string, OrderWithItems>> {
    try {
      if (tableIds.length === 0) {
        return new Map();
      }

      // Get active orders for these tables
      const activeOrders = await db.select()
        .from(orders)
        .where(and(
          eq(orders.restaurantId, restaurantId),
          inArray(orders.tableId, tableIds),
          inArray(orders.status, ['placed', 'under_process', 'served', 'completed'])
        ));

      if (activeOrders.length === 0) {
        return new Map();
      }

      // Get order items for these orders
      const orderIds = activeOrders.map(order => order.id);
      const orderItemsData = await db.select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));

      // Get menu items for these order items
      const menuItemIds = orderItemsData.map(item => item.menuItemId);
      const menuItemsData = await db.select()
        .from(menuItems)
        .where(inArray(menuItems.id, menuItemIds));

      // Create a map of orders with their items
      const ordersMap = new Map<string, OrderWithItems>();
      activeOrders.forEach(order => {
        const items = orderItemsData
          .filter(item => item.orderId === order.id)
          .map(item => ({
            ...item,
            menuItem: menuItemsData.find(mi => mi.id === item.menuItemId)!
          }));
        ordersMap.set(order.tableId.toString(), { ...order, items });
      });

      return ordersMap;
    } catch (error) {
      console.error(`[ERROR] Error fetching active orders:`, error);
      return new Map();
    }
  }

  // Operating Hours methods
  async getOperatingHours(id: number): Promise<OperatingHours | undefined> {
    const result = await db.query.operatingHours.findFirst({
      where: eq(operatingHours.id, id)
    });
    return result;
  }

  async getOperatingHoursByRestaurant(restaurantId: number): Promise<OperatingHours[]> {
    return await db.query.operatingHours.findMany({
      where: eq(operatingHours.restaurantId, restaurantId)
    });
  }

  async createOperatingHours(hours: InsertOperatingHours): Promise<OperatingHours> {
    const result = await db.insert(operatingHours).values(hours).returning();
    return result[0];
  }

  async updateOperatingHours(id: number, hoursUpdates: Partial<OperatingHours>): Promise<OperatingHours | undefined> {
    const result = await db.update(operatingHours)
      .set(hoursUpdates)
      .where(eq(operatingHours.id, id))
      .returning();
    return result[0];
  }

  async deleteOperatingHours(id: number): Promise<boolean> {
    const result = await db.delete(operatingHours)
      .where(eq(operatingHours.id, id))
      .returning();
    return result.length > 0;
  }

  // Floor Plan methods
  async getFloorPlan(id: number): Promise<FloorPlan | undefined> {
    const result = await db.query.floorPlans.findFirst({
      where: eq(floorPlans.id, id)
    });
    return result;
  }

  async getFloorPlansByRestaurant(restaurantId: number): Promise<FloorPlan[]> {
    return await db.query.floorPlans.findMany({
      where: eq(floorPlans.restaurantId, restaurantId)
    });
  }

  async getAllFloorPlans(): Promise<FloorPlan[]> {
    return await db.query.floorPlans.findMany();
  }

  async createFloorPlan(floorPlan: InsertFloorPlan): Promise<FloorPlan> {
    const result = await db.insert(floorPlans).values(floorPlan).returning();
    return result[0];
  }

  async updateFloorPlan(id: number, floorPlanUpdates: Partial<FloorPlan>): Promise<FloorPlan | undefined> {
    const result = await db.update(floorPlans)
      .set(floorPlanUpdates)
      .where(eq(floorPlans.id, id))
      .returning();
    return result[0];
  }

  async deleteFloorPlan(id: number): Promise<boolean> {
    const result = await db.delete(floorPlans)
      .where(eq(floorPlans.id, id))
      .returning();
    return result.length > 0;
  }

  async getFloorPlanWithTables(id: number): Promise<FloorPlanWithTables | undefined> {
    const floorPlan = await this.getFloorPlan(id);
    if (!floorPlan) return undefined;

    const tableConfigs = await this.getTableConfigsByFloorPlan(id);
    const tablesWithConfigs = await Promise.all(
      tableConfigs.map(async config => {
        const table = await this.getTable(config.tableId);
        return { ...(table as Table), config };
      })
    );

    return { ...floorPlan, tables: tablesWithConfigs };
  }

  // Table Config methods
  async getTableConfig(id: number): Promise<TableConfig | undefined> {
    const result = await db.query.tableConfigs.findFirst({
      where: eq(tableConfigs.id, id)
    });
    return result;
  }

  async getTableConfigByTable(tableId: number): Promise<TableConfig | undefined> {
    const result = await db.query.tableConfigs.findFirst({
      where: eq(tableConfigs.tableId, tableId)
    });
    return result;
  }

  async getTableConfigsByFloorPlan(floorPlanId: number): Promise<TableConfig[]> {
    try {
      const result = await db.select().from(tableConfigs).where(eq(tableConfigs.floorPlanId, floorPlanId));
      return result;
    } catch (error) {
      console.error(`Error fetching table configs for floor plan ${floorPlanId}:`, error);
      return [];
    }
  }

  async createTableConfig(tableConfig: InsertTableConfig): Promise<TableConfig> {
    const result = await db.insert(tableConfigs).values(tableConfig).returning();
    return result[0];
  }

  async updateTableConfig(id: number, data: Partial<TableConfig>): Promise<TableConfig> {
    const result = await db.update(tableConfigs)
      .set(data)
      .where(eq(tableConfigs.id, id))
      .returning();
    if (!result[0]) {
      throw new Error(`Table config ${id} not found`);
    }
    return result[0];
  }

  async deleteTableConfig(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(tableConfigs)
        .where(eq(tableConfigs.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("[ERROR] Failed to delete table config:", error);
      throw error;
    }
  }

  async getTableWithConfig(tableId: number): Promise<TableWithConfig | undefined> {
    const result = await db.query.tables.findFirst({
      where: eq(tables.id, tableId),
      with: {
        config: true
      }
    });
    return result;
  }

  async updateTableReservation(id: number, reserved: boolean): Promise<Table | undefined> {
    const result = await db.update(tables)
      .set({ status: reserved ? "reserved" : "available" })
      .where(eq(tables.id, id))
      .returning();
    return result[0];
  }

  async reserveTable(tableId: number): Promise<void> {
    await db.update(tables)
      .set({ status: "reserved" })
      .where(eq(tables.id, tableId));
  }

  async unreserveTable(tableId: number): Promise<void> {
    await db.update(tables)
      .set({ status: "available" })
      .where(eq(tables.id, tableId));
  }

  async deleteAllTables(): Promise<void> {
    try {
      await db.delete(tables);
    } catch (error) {
      console.error("[ERROR] Failed to delete all tables:", error);
      throw error;
    }
  }

  // Restaurant methods
  async getRestaurantByAdmin(userId: number): Promise<Restaurant | undefined> {
    const user = await this.getUser(userId);
    if (!user || user.role !== "admin" || !user.restaurantId) {
      return undefined;
    }
    return this.getRestaurant(user.restaurantId);
  }

  async createDefaultTablesForFloorPlan(floorPlanId: number, floorNumber: number, restaurantId: number): Promise<void> {
    try {
      console.log(`[DEBUG] Creating default tables for floor plan ${floorPlanId}`);
      
      // Create 4 default tables for each floor
      const defaultTables = [
        { tableNumber: 1, floorNumber, restaurantId },
        { tableNumber: 2, floorNumber, restaurantId },
        { tableNumber: 3, floorNumber, restaurantId },
        { tableNumber: 4, floorNumber, restaurantId }
      ];

      for (const table of defaultTables) {
        const createdTable = await this.createTable(restaurantId, {
          tableNumber: table.tableNumber,
          floorNumber: table.floorNumber,
          status: "available"
        });

        // Create default table config
        await db.insert(tableConfigs).values({
          tableId: createdTable.id,
          floorPlanId,
          xPosition: (table.tableNumber - 1) * 5,
          yPosition: 5,
          width: 4,
          height: 4,
          shape: 'rectangle',
          seats: 4,
          isActive: true
        });
      }

      console.log(`[DEBUG] Created default tables for floor plan ${floorPlanId}`);
    } catch (error) {
      console.error(`[ERROR] Failed to create default tables for floor plan ${floorPlanId}:`, error);
      throw error;
    }
  }
}

// Export the PostgreSQL storage instance
export const storage = new PostgresStorage();
