import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  cartItemSchema, 
  insertMenuItemSchema, 
  insertOrderItemSchema, 
  insertOrderSchema, 
  insertPaymentSchema, 
  insertTableSchema, 
  updateOrderStatusSchema,
  insertRestaurantSchema,
  insertOperatingHoursSchema,
  insertFloorPlanSchema,
  insertTableConfigSchema,
  User, 
  Table, 
  Order, 
  OrderItem,
  MenuItem,
  Payment, 
  Restaurant, 
  OperatingHours, 
  FloorPlan, 
  TableConfig,
  InsertTableConfig,
  InsertFloorPlan,
  InsertOperatingHours,
  InsertPayment,
  InsertOrderItem,
  InsertOrder,
  InsertUser,
  InsertRestaurant,
  updateRestaurantSchema,
  OrderWithItems
} from "../shared/schema";
import { ZodError } from "zod";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { restaurants } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Auth middleware for admin routes
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    next();
  };

  // Auth middleware for customer routes
  const requireAuth = (req: any, res: any, next: any) => {
    console.log("[DEBUG] requireAuth - isAuthenticated:", req.isAuthenticated());
    console.log("[DEBUG] requireAuth - user:", req.user);
    if (!req.isAuthenticated()) {
      console.log("[ERROR] requireAuth - Not authenticated");
      return res.status(401).json({ message: "Not authenticated" });
    }
    console.log("[DEBUG] requireAuth - User authenticated, proceeding");
    next();
  };

  // Error handling middleware for Zod validation
  const validateRequest = (schema: any, property: 'body' | 'query' | 'params') => {
    return (req: any, res: any, next: any) => {
      try {
        req[property] = schema.parse(req[property]);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({ 
            message: "Validation error", 
            errors: error.errors 
          });
        }
        next(error);
      }
    };
  };

  // Restaurant tables API
  app.get("/api/tables", requireAdmin, async (req, res) => {
    try {
      if (!req.user?.restaurantId) {
        return res.status(400).json({ message: "Restaurant ID not found" });
      }
      const tables = await storage.getTables(req.user.restaurantId);
      res.json(tables);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tables" });
    }
  });

  app.get("/api/tables/floor/:floorNumber", async (req, res) => {
    try {
      if (!req.user?.restaurantId) {
        return res.status(400).json({ message: "Restaurant ID not found" });
      }
      const floorNumber = parseInt(req.params.floorNumber);
      const tables = await storage.getTablesByFloor(req.user.restaurantId, floorNumber);
      res.json(tables);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tables for floor" });
    }
  });

  app.get("/api/tables/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const table = await storage.getTable(id);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.json(table);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch table" });
    }
  });

  app.post("/api/tables", requireAdmin, validateRequest(insertTableSchema, 'body'), async (req, res) => {
    try {
      if (!req.user?.restaurantId) {
        return res.status(400).json({ message: "Restaurant ID not found" });
      }
      
      console.log("[DEBUG] Creating table with data:", req.body);
      
      // Validate required fields
      if (!req.body.tableNumber || !req.body.floorNumber) {
        console.error("[ERROR] Missing required fields:", req.body);
        return res.status(400).json({ 
          message: "Missing required fields",
          error: "tableNumber and floorNumber are required",
          receivedData: req.body
        });
      }

      // Ensure numeric values are integers
      const tableData = {
        tableNumber: parseInt(String(req.body.tableNumber)),
        floorNumber: parseInt(String(req.body.floorNumber)),
        qrCodeUrl: req.body.qrCodeUrl || `/table/${req.body.tableNumber}`,
        status: "available" as const
      };

      console.log("[DEBUG] Processed table data:", tableData);
      
      try {
        const newTable = await storage.createTable(req.user.restaurantId, tableData);
        
        if (!newTable) {
          console.error("[ERROR] No table returned from storage");
          throw new Error("Failed to create table: No table returned from storage");
        }
        
        console.log("[DEBUG] Created table:", newTable);
        res.status(201).json(newTable);
      } catch (error) {
        console.error("[ERROR] Storage error:", error);
        throw error;
      }
    } catch (error) {
      console.error("[ERROR] Failed to create table:", error);
      res.status(500).json({ 
        message: "Failed to create table",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.delete("/api/tables", async (req, res) => {
    try {
      await storage.deleteAllTables();
      res.status(204).send();
    } catch (error) {
      console.error("[ERROR] Failed to delete tables:", error);
      res.status(500).json({ 
        message: "Failed to delete tables",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/tables/with-orders", requireAdmin, async (req, res) => {
    try {
      const tablesWithOrders = await storage.getAllTablesWithOrders();
      res.json(tablesWithOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tables with orders" });
    }
  });

  app.get("/api/tables/:id/active-order", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tableWithOrder = await storage.getTableWithOrder(id);
      if (!tableWithOrder) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.json(tableWithOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch table with order" });
    }
  });

  // Menu items API
  app.get("/api/menu-items", async (req, res) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string);
      if (isNaN(restaurantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      
      const categoryFilter = req.query.category as string;
      const menuItems = await storage.getMenuItems(restaurantId, categoryFilter);
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  app.get("/api/menu-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const menuItem = await storage.getMenuItem(id);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(menuItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu item" });
    }
  });

  app.post("/api/menu-items", requireAdmin, validateRequest(insertMenuItemSchema, 'body'), async (req, res) => {
    try {
      if (!req.user?.restaurantId) {
        return res.status(400).json({ message: "Restaurant ID not found" });
      }
      const newMenuItem = await storage.createMenuItem(req.user.restaurantId, req.body);
      res.status(201).json(newMenuItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  app.put("/api/menu-items/:id", requireAdmin, async (req, res) => {
    try {
      if (!req.user?.restaurantId) {
        return res.status(400).json({ message: "Restaurant ID not found" });
      }
      const id = parseInt(req.params.id);
      const updatedMenuItem = await storage.updateMenuItem(id, { ...req.body, restaurantId: req.user.restaurantId });
      if (!updatedMenuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(updatedMenuItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  app.delete("/api/menu-items/:id", requireAdmin, async (req, res) => {
    try {
      if (!req.user?.restaurantId) {
        return res.status(400).json({ message: "Restaurant ID not found" });
      }
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMenuItem(id);
      if (!deleted) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });

  // Orders API
  app.get("/api/orders", requireAdmin, async (req, res) => {
    try {
      const restaurantId = Number(req.query.restaurantId);
      console.log("[DEBUG] /api/orders - Restaurant ID:", restaurantId);
      
      if (!restaurantId || isNaN(restaurantId)) {
        console.log("[ERROR] /api/orders - Invalid restaurant ID");
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }

      console.log("[DEBUG] /api/orders - Fetching orders with items");
      const orders = await storage.getOrdersWithItems(restaurantId);
      console.log("[DEBUG] /api/orders - Found", orders.length, "orders");
      
      res.json(orders);
    } catch (error) {
      console.error("[ERROR] Failed to fetch orders:", error);
      res.status(500).json({ 
        message: "Failed to fetch orders",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/orders/status/:status", requireAdmin, async (req, res) => {
    try {
      if (!req.user?.restaurantId) {
        return res.status(400).json({ message: "Restaurant ID not found" });
      }
      const status = req.params.status as any;
      const orders = await storage.getOrdersByStatus(req.user.restaurantId, status);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders by status" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrderWithItems(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", requireAuth, validateRequest(insertOrderSchema, 'body'), async (req, res) => {
    try {
      if (!req.user?.restaurantId) {
        return res.status(400).json({ message: "Restaurant ID not found" });
      }
      const newOrder = await storage.createOrder(req.user.restaurantId, {
        ...req.body,
        userId: req.user.id
      });
      res.status(201).json(newOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.post("/api/orders/:id/items", requireAuth, validateRequest(insertOrderItemSchema, 'body'), async (req, res) => {
    try {
      if (!req.user?.restaurantId) {
        return res.status(400).json({ message: "Restaurant ID not found" });
      }
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Check if order belongs to the user or user is admin
      if (order.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to add items to this order" });
      }

      // Get menu item to capture current price
      const menuItem = await storage.getMenuItem(req.body.menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      const newOrderItem = await storage.createOrderItem({
        ...req.body,
        orderId,
        price: menuItem.price,
        restaurantId: req.user.restaurantId
      });
      
      res.status(201).json(newOrderItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to add order item" });
    }
  });

  app.patch("/api/orders/:id/status", requireAdmin, validateRequest(updateOrderStatusSchema, 'body'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const updatedOrder = await storage.updateOrderStatus(id, status);
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // If order is completed, create payment record
      if (status === 'completed') {
        const order = await storage.getOrderWithItems(id);
        if (order) {
          const totalAmount = order.items.reduce(
            (sum: number, item: OrderItem & { menuItem: MenuItem }) => 
              sum + (item.price * item.quantity), 
            0
          );
          
          // Create payment record
          await storage.createPayment({
            orderId: id,
            restaurantId: order.restaurantId,
            customerId: order.userId || 0, // Use 0 as fallback if userId is null
            amount: totalAmount,
            status: 'pending',
            paymentUrl: `/payments/${id}`
          });
        }
      }
      
      // If order is paid, update table status
      if (status === 'paid') {
        const payment = await storage.getPaymentByOrderId(id);
        if (payment) {
          await storage.updatePaymentStatus(payment.id, 'paid');
        }
      }
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Cart operations - process a cart of items to create an order with items
  app.post("/api/order-from-cart", requireAuth, async (req, res) => {
    try {
      console.log("[DEBUG] /api/order-from-cart - Request body:", req.body);
      console.log("[DEBUG] /api/order-from-cart - User:", req.user);
      
      const { tableId, items, restaurantId: requestRestaurantId } = req.body;
      
      console.log("[DEBUG] /api/order-from-cart - TableId:", tableId, "RestaurantId:", requestRestaurantId, "Items count:", items?.length);
      
      // Validate the cart items
      const validatedItems = items.map((item: any) => cartItemSchema.parse(item));
      
      if (validatedItems.length === 0) {
        console.log("[ERROR] /api/order-from-cart - Cart is empty");
        return res.status(400).json({ message: "Cart is empty" });
      }
      
      console.log("[DEBUG] /api/order-from-cart - Validated items:", validatedItems.length);
      
      // Get table information - first check if tableId is a direct table ID or table number
      let table: any = await storage.getTable(tableId);
      console.log("[DEBUG] /api/order-from-cart - Direct table lookup result:", table);
      
      // If not found by ID and we have restaurantId, try to find by restaurant ID and table number combination
      if (!table && requestRestaurantId) {
        console.log("[DEBUG] /api/order-from-cart - Trying to find table by restaurantId and tableNumber");
        // Get all tables for this restaurant
        const restaurantTables = await storage.getTables(parseInt(requestRestaurantId));
        console.log("[DEBUG] /api/order-from-cart - Restaurant tables count:", restaurantTables.length);
        
        // Find table by table number (assuming tableId is actually tableNumber)
        table = restaurantTables.find(t => t.tableNumber === parseInt(tableId));
        console.log("[DEBUG] /api/order-from-cart - Table found by tableNumber:", table);
      }
      
      // Fallback: search all tables if still not found
      if (!table) {
        console.log("[DEBUG] /api/order-from-cart - Fallback: searching all tables");
        const allTables = await storage.getAllTablesWithOrders();
        console.log("[DEBUG] /api/order-from-cart - All tables count:", allTables.length);
        
        // Find table by table number (assuming tableId is actually tableNumber)
        table = allTables.find(t => t.tableNumber === parseInt(tableId));
        console.log("[DEBUG] /api/order-from-cart - Table found by tableNumber in all tables:", table);
      }
      
      if (!table) {
        console.log("[ERROR] /api/order-from-cart - Table not found:", tableId);
        return res.status(404).json({ message: "Table not found" });
      }
      
      // Check if there's already an active order for this table
      const activeOrder = await storage.getActiveOrderForTable(table.id);
      console.log("[DEBUG] /api/order-from-cart - Active order check:", activeOrder);
      
      if (activeOrder) {
        console.log("[ERROR] /api/order-from-cart - Active order exists:", activeOrder.id);
        return res.status(400).json({ 
          message: "There is already an active order for this table",
          orderId: activeOrder.id
        });
      }
      
      if (!req.user) {
        console.log("[ERROR] /api/order-from-cart - User not authenticated");
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Use restaurantId from the table instead of user
      const restaurantId = table.restaurantId;
      console.log("[DEBUG] /api/order-from-cart - Using restaurantId from table:", restaurantId);
      
      // Create the order
      console.log("[DEBUG] /api/order-from-cart - Creating order with:", {
        restaurantId,
        tableId: table.id, // Use the actual table ID from database
        userId: req.user.id,
        status: 'placed'
      });
      
      const newOrder = await storage.createOrder(restaurantId, {
        tableId: table.id, // Use the actual table ID from database
        userId: req.user.id,
        status: 'placed'
      });
      
      console.log("[DEBUG] /api/order-from-cart - Created order:", newOrder);
      
      // Add items to the order
      for (const item of validatedItems) {
        const menuItem = await storage.getMenuItem(item.menuItemId);
        if (!menuItem) {
          continue; // Skip if menu item not found
        }
        
        await storage.createOrderItem({
          orderId: newOrder.id,
          menuItemId: item.menuItemId,
          restaurantId: restaurantId,
          quantity: item.quantity,
          price: menuItem.price
        });
      }
      
      // Return the complete order with items
      const completeOrder = await storage.getOrderWithItems(newOrder.id);
      console.log("[DEBUG] /api/order-from-cart - Order created successfully:", completeOrder?.id);
      res.status(201).json(completeOrder);
    } catch (error) {
      console.error("[ERROR] /api/order-from-cart - Error occurred:", error);
      if (error instanceof ZodError) {
        console.error("[ERROR] /api/order-from-cart - Zod validation error:", error.errors);
        return res.status(400).json({ 
          message: "Invalid cart data", 
          errors: error.errors 
        });
      }
      console.error("[ERROR] /api/order-from-cart - General error:", error);
      res.status(500).json({ 
        message: "Failed to create order from cart",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Payments API
  app.get("/api/payments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getPayment(id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment" });
    }
  });

  app.get("/api/orders/:id/payment", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const payment = await storage.getPaymentByOrderId(orderId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found for this order" });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment" });
    }
  });

  app.post("/api/payments", requireAdmin, validateRequest(insertPaymentSchema, 'body'), async (req, res) => {
    try {
      const newPayment = await storage.createPayment(req.body);
      res.status(201).json(newPayment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.post("/api/payments/:id/process", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getPayment(id);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // In a real app, we would process the payment with a payment gateway
      // Here we'll just simulate payment success
      const updatedPayment = await storage.updatePaymentStatus(id, 'paid');
      
      // Update order status to paid
      if (updatedPayment) {
        await storage.updateOrderStatus(updatedPayment.orderId, 'paid');
      }
      
      res.json(updatedPayment);
    } catch (error) {
      res.status(500).json({ message: "Failed to process payment" });
    }
  });

  // Process payment for an order
  app.post("/api/orders/:id/process-payment", requireAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { method } = req.body;
      
      if (!method) {
        return res.status(400).json({ message: "Payment method is required" });
      }
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if order is in 'completed' status
      if (order.status !== 'completed') {
        return res.status(400).json({ message: "Order is not ready for payment" });
      }
      
      // Get payment record or create one if it doesn't exist
      let payment = await storage.getPaymentByOrderId(orderId);
      
      if (!payment) {
        // Calculate order total
        const orderWithItems = await storage.getOrderWithItems(orderId);
        if (!orderWithItems) {
          return res.status(404).json({ message: "Order items not found" });
        }
        
        const totalAmount = orderWithItems.items.reduce(
          (sum: number, item: OrderItem & { menuItem: MenuItem }) => 
            sum + (item.price * item.quantity), 
          0
        );
        
        // Create payment record
        payment = await storage.createPayment({
          orderId,
          restaurantId: order.restaurantId,
          customerId: order.userId || 0, // Use 0 as fallback if userId is null
          amount: totalAmount,
          status: 'pending',
          paymentUrl: `/payments/${orderId}`
        });
      }
      
      // In a real app, integrate with actual payment providers based on method
      // For demonstration, we'll simply mark the payment as successful
      
      // Handle specific payment methods
      if (method === "google_pay") {
        console.log("Processing Google Pay payment for order:", orderId);
        // In a real implementation, we would call Google Pay API here
      } else if (method === "phonepe") {
        console.log("Processing PhonePe payment for order:", orderId);
        // In a real implementation, we would call PhonePe API here
      }
      
      // Process payment
      await storage.updatePaymentStatus(payment.id, 'paid');
      
      // Update order status to paid
      await storage.updateOrderStatus(orderId, 'paid');
      
      // Return success
      res.status(200).json({ 
        success: true,
        message: "Payment processed successfully",
        orderId,
        paymentMethod: method
      });
    } catch (error) {
      console.error("Payment processing error:", error);
      res.status(500).json({ 
        message: "Failed to process payment",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Analytics API for admin dashboard
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const restaurantId = Number(req.query.restaurantId);
      console.log("[DEBUG] /api/admin/stats - Restaurant ID:", restaurantId);
      
      if (!restaurantId || isNaN(restaurantId)) {
        console.log("[ERROR] /api/admin/stats - Invalid restaurant ID");
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }

      console.log("[DEBUG] /api/admin/stats - Fetching restaurant details and orders");
      const [restaurantDetails, orders] = await Promise.all([
        storage.getRestaurantWithDetails(restaurantId),
        storage.getOrdersWithItems(restaurantId)
      ]);

      if (!restaurantDetails) {
        console.log("[ERROR] /api/admin/stats - Restaurant details not found");
        throw new Error("Restaurant details not found");
      }
      console.log("[DEBUG] /api/admin/stats - Found restaurant details and", orders.length, "orders");
      
      // Count active orders
      const activeOrders = orders.filter(order => 
        ['placed', 'under_process', 'served'].includes(order.status)
      );
      console.log("[DEBUG] /api/admin/stats - Active orders:", activeOrders.length);
      
      // Count completed orders
      const completedOrders = orders.filter(order => 
        ['completed', 'paid'].includes(order.status)
      );
      console.log("[DEBUG] /api/admin/stats - Completed orders:", completedOrders.length);
      
      // Get all tables from floor plans and count them
      let totalTables = 0;
      for (const floorPlan of restaurantDetails.floorPlans) {
        totalTables += floorPlan.tables?.length || 0;
      }
      console.log("[DEBUG] /api/admin/stats - Total tables:", totalTables);
      
      // Count occupied tables (tables with active orders)
      const occupiedTables = activeOrders.length;
      console.log("[DEBUG] /api/admin/stats - Occupied tables:", occupiedTables);
      
      // Calculate today's revenue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const paidOrders = orders.filter(order => 
        order.status === 'paid' && 
        order.createdAt >= today
      );
      
      const todaysRevenue = paidOrders.reduce((sum: number, order: OrderWithItems) => {
        return sum + order.items.reduce(
          (itemSum: number, item: OrderItem & { menuItem: MenuItem }) => 
            itemSum + (item.price * item.quantity), 
          0
        );
      }, 0);
      console.log("[DEBUG] /api/admin/stats - Today's revenue:", todaysRevenue);
      
      const response = {
        activeOrders: activeOrders.length,
        completedOrders: completedOrders.length,
        occupiedTables,
        totalTables,
        todaysRevenue
      };
      console.log("[DEBUG] /api/admin/stats - Response:", response);
      
      res.json(response);
    } catch (error) {
      console.error("[ERROR] Failed to fetch admin stats:", error);
      res.status(500).json({ 
        message: "Failed to fetch admin stats",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Restaurant Setup API
  app.get("/api/restaurant", async (req, res) => {
    try {
      // Check if user is authenticated and has a restaurantId
      if (req.isAuthenticated() && req.user?.restaurantId) {
        console.log("[DEBUG] Fetching restaurant for user:", req.user.id);
        const restaurant = await storage.getRestaurant(req.user.restaurantId);
        if (!restaurant) {
          console.log("[DEBUG] No restaurant found for user");
          return res.status(404).json({ message: "Restaurant configuration not found" });
        }
        console.log("[DEBUG] Found restaurant for user:", restaurant);
        return res.json(restaurant);
      }
      
      // Fallback to default restaurant if not authenticated or no restaurantId
      console.log("[DEBUG] Fetching default restaurant (fallback)");
      const restaurant = await storage.getDefaultRestaurant();
      if (!restaurant) {
        console.log("[DEBUG] No restaurant found");
        return res.status(404).json({ message: "Restaurant configuration not found" });
      }
      console.log("[DEBUG] Found restaurant:", restaurant);
      res.json(restaurant);
    } catch (error) {
      console.error("[ERROR] Failed to fetch restaurant:", error);
      res.status(500).json({ message: "Failed to fetch restaurant configuration" });
    }
  });

  app.get("/api/restaurant/details", requireAdmin, async (req, res) => {
    try {
      if (!req.user?.restaurantId) {
        return res.status(400).json({ message: "Restaurant ID not found" });
      }

      const details = await storage.getRestaurantWithDetails(req.user.restaurantId);
      if (!details) {
        return res.status(404).json({ message: "Restaurant details not found" });
      }

      res.json(details);
    } catch (error) {
      console.error("[ERROR] Failed to fetch restaurant details:", error);
      res.status(500).json({ 
        message: "Failed to fetch restaurant details",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/restaurant/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  app.get("/api/restaurant/:id/details", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }
      console.log(`[DEBUG] Fetching details for restaurant ID: ${id}`);
      
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        console.log(`[ERROR] Restaurant with ID ${id} not found`);
        return res.status(404).json({ message: "Restaurant not found" });
      }
      console.log(`[DEBUG] Found restaurant: ${JSON.stringify(restaurant)}`);

      const details = await storage.getRestaurantWithDetails(id);
      console.log(`[DEBUG] Restaurant details fetched successfully`);
      res.json(details);
    } catch (error) {
      console.error("[ERROR] Failed to fetch restaurant details:", error);
      res.status(500).json({ 
        message: "Failed to fetch restaurant details",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/restaurant", requireAdmin, validateRequest(insertRestaurantSchema, 'body'), async (req, res) => {
    try {
      const newRestaurant = await storage.createRestaurant(req.body);
      res.status(201).json(newRestaurant);
    } catch (error) {
      res.status(500).json({ message: "Failed to create restaurant" });
    }
  });

  app.put("/api/restaurant/:id", requireAdmin, validateRequest(updateRestaurantSchema, 'body'), async (req, res) => {
    const restaurantId = parseInt(req.params.id);
    if (isNaN(restaurantId)) {
      console.error("[ERROR] Invalid restaurant ID:", req.params.id);
      return res.status(400).json({ error: "Invalid restaurant ID" });
    }

    try {
      console.log("[DEBUG] Updating restaurant", restaurantId, "with data:", req.body);
      
      // Get current restaurant data
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        console.error("[ERROR] Restaurant not found:", restaurantId);
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      // Update restaurant using storage method
      const updatedRestaurant = await storage.updateRestaurant(restaurantId, req.body);
      if (!updatedRestaurant) {
        console.error("[ERROR] Failed to update restaurant:", restaurantId);
        return res.status(500).json({ error: "Failed to update restaurant" });
      }

      console.log("[DEBUG] Successfully updated restaurant:", updatedRestaurant);
      return res.json(updatedRestaurant);
    } catch (error) {
      console.error("[ERROR] Failed to update restaurant:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Operating Hours API
  app.get("/api/operating-hours/restaurant/:restaurantId", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const hours = await storage.getOperatingHoursByRestaurant(restaurantId);
      res.json(hours);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch operating hours" });
    }
  });

  app.get("/api/operating-hours/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const hours = await storage.getOperatingHours(id);
      if (!hours) {
        return res.status(404).json({ message: "Operating hours not found" });
      }
      res.json(hours);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch operating hours" });
    }
  });

  app.post("/api/operating-hours", requireAdmin, validateRequest(insertOperatingHoursSchema, 'body'), async (req, res) => {
    try {
      const { restaurantId, dayOfWeek } = req.body;
      if (!restaurantId || dayOfWeek === undefined) {
        return res.status(400).json({ message: "restaurantId and dayOfWeek are required" });
      }
      const newHours = await storage.createOperatingHours(req.body);
      res.status(201).json(newHours);
    } catch (error) {
      res.status(500).json({ message: "Failed to create operating hours" });
    }
  });

  app.put("/api/operating-hours/:id", requireAdmin, validateRequest(insertOperatingHoursSchema, 'body'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { restaurantId, dayOfWeek } = req.body;
      if (!restaurantId || dayOfWeek === undefined) {
        return res.status(400).json({ message: "restaurantId and dayOfWeek are required" });
      }
      const updatedHours = await storage.updateOperatingHours(id, req.body);
      if (!updatedHours) {
        return res.status(404).json({ message: "Operating hours not found" });
      }
      res.json(updatedHours);
    } catch (error) {
      res.status(500).json({ message: "Failed to update operating hours" });
    }
  });

  app.delete("/api/operating-hours/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOperatingHours(id);
      if (!deleted) {
        return res.status(404).json({ message: "Operating hours not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete operating hours" });
    }
  });

  // Floor Plan API
  app.get("/api/floor-plans", async (req, res) => {
    try {
      const restaurantId = req.query.restaurantId as string | undefined;
      let floorPlans;
      
      if (restaurantId) {
        // If restaurantId is provided, get floor plans for that restaurant
        floorPlans = await storage.getFloorPlansByRestaurant(parseInt(restaurantId));
      } else {
        // If no restaurantId, get all floor plans
        floorPlans = await storage.getAllFloorPlans();
      }
      
      // Always return JSON, even if floorPlans is empty
      res.json(floorPlans || []);
    } catch (error) {
      console.error("[ERROR] Failed to fetch floor plans:", error);
      res.status(500).json({ 
        message: "Failed to fetch floor plans",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/floor-plans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const floorPlan = await storage.getFloorPlan(id);
      if (!floorPlan) {
        return res.status(404).json({ message: "Floor plan not found" });
      }
      res.json(floorPlan);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch floor plan" });
    }
  });

  app.get("/api/floor-plans/:id/with-tables", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const floorPlan = await storage.getFloorPlanWithTables(id);
      if (!floorPlan) {
        return res.status(404).json({ message: "Floor plan not found" });
      }
      res.json(floorPlan);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch floor plan with tables" });
    }
  });

  // Add endpoint to get all floor plans with tables
  app.get("/api/floor-plans/with-tables", async (req, res) => {
    try {
      // Get all floor plans
      const floorPlans = await storage.getAllFloorPlans();
      
      // Get tables for each floor plan
      const floorPlansWithTables = await Promise.all(
        floorPlans.map(async (plan) => {
          const tables = await storage.getTableConfigsByFloorPlan(plan.id);
          return {
            ...plan,
            tables: tables.map(config => ({
              id: config.tableId,
              tableNumber: config.tableId, // Use tableId as tableNumber for now
              floorNumber: plan.floorNumber,
              qrCodeUrl: `/table/${plan.floorNumber}/${config.tableId}`,
              config: config
            }))
          };
        })
      );
      
      res.json(floorPlansWithTables);
    } catch (error) {
      console.error("Error fetching floor plans with tables:", error);
      res.status(500).json({ message: "Failed to fetch floor plans with tables" });
    }
  });

  app.post("/api/floor-plans", requireAdmin, validateRequest(insertFloorPlanSchema, 'body'), async (req, res) => {
    try {
      const newFloorPlan = await storage.createFloorPlan(req.body);
      res.status(201).json(newFloorPlan);
    } catch (error) {
      res.status(500).json({ message: "Failed to create floor plan" });
    }
  });

  app.put("/api/floor-plans/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedFloorPlan = await storage.updateFloorPlan(id, req.body);
      if (!updatedFloorPlan) {
        return res.status(404).json({ message: "Floor plan not found" });
      }
      res.json(updatedFloorPlan);
    } catch (error) {
      res.status(500).json({ message: "Failed to update floor plan" });
    }
  });

  app.delete("/api/floor-plans/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteFloorPlan(id);
      if (!deleted) {
        return res.status(404).json({ message: "Floor plan not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete floor plan" });
    }
  });

  // Table Config API
  app.get("/api/table-configs/floor-plan/:floorPlanId", async (req, res) => {
    try {
      const floorPlanId = parseInt(req.params.floorPlanId);
      const tableConfigs = await storage.getTableConfigsByFloorPlan(floorPlanId);
      res.json(tableConfigs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch table configurations" });
    }
  });

  app.get("/api/table-configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tableConfig = await storage.getTableConfig(id);
      if (!tableConfig) {
        return res.status(404).json({ message: "Table configuration not found" });
      }
      res.json(tableConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch table configuration" });
    }
  });

  app.get("/api/tables/:id/config", async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      const tableWithConfig = await storage.getTableWithConfig(tableId);
      if (!tableWithConfig) {
        return res.status(404).json({ message: "Table with configuration not found" });
      }
      res.json(tableWithConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch table with configuration" });
    }
  });

  app.post("/api/table-configs", requireAdmin, validateRequest(insertTableConfigSchema, 'body'), async (req, res) => {
    try {
      if (!req.user?.restaurantId) {
        return res.status(400).json({ message: "Restaurant ID not found" });
      }

      // Transform and validate the request body
      const tableConfigData: InsertTableConfig = {
        tableId: parseInt(String(req.body.tableId)),
        floorPlanId: parseInt(String(req.body.floorPlanId)),
        xPosition: parseInt(String(req.body.xPosition)),
        yPosition: parseInt(String(req.body.yPosition)),
        width: parseInt(String(req.body.width)) || 1,
        height: parseInt(String(req.body.height)) || 1,
        shape: req.body.shape || "rectangle",
        seats: parseInt(String(req.body.seats)) || 4,
        isActive: req.body.isActive ?? true
      };

      const newTableConfig = await storage.createTableConfig(tableConfigData);
      res.status(201).json(newTableConfig);
    } catch (error) {
      console.error("[ERROR] Failed to create table config:", error);
      res.status(500).json({ message: "Failed to create table configuration" });
    }
  });

  app.put("/api/table-configs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedTableConfig = await storage.updateTableConfig(id, req.body);
      if (!updatedTableConfig) {
        return res.status(404).json({ message: "Table configuration not found" });
      }
      res.json(updatedTableConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to update table configuration" });
    }
  });

  app.delete("/api/table-configs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTableConfig(id);
      if (!deleted) {
        return res.status(404).json({ message: "Table config not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("[ERROR] Failed to delete table config:", error);
      res.status(500).json({ 
        message: "Failed to delete table config",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Table management API
  app.post("/api/tables/:id/reserve", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reserved } = req.body;
      
      if (typeof reserved !== 'boolean') {
        return res.status(400).json({ error: 'Reserved status must be a boolean' });
      }

      const updatedTable = await storage.updateTableReservation(id, reserved);
      if (!updatedTable) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.json(updatedTable);
    } catch (error) {
      res.status(500).json({ message: "Failed to update table reservation" });
    }
  });

  app.put("/api/tables/:id/config", requireAdmin, validateRequest(insertTableConfigSchema, 'body'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedTable = await storage.updateTableConfig(id, req.body);
      if (!updatedTable) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.json(updatedTable);
    } catch (error) {
      res.status(500).json({ message: "Failed to update table configuration" });
    }
  });

  // Debug endpoint to check restaurant existence
  app.get("/api/debug/restaurant/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[DEBUG] Checking existence of restaurant ID: ${id}`);
      
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        console.log(`[ERROR] Restaurant with ID ${id} not found`);
        return res.status(404).json({ 
          exists: false,
          message: "Restaurant not found" 
        });
      }

      console.log(`[DEBUG] Restaurant found: ${JSON.stringify(restaurant)}`);
      return res.json({ 
        exists: true,
        restaurant 
      });
    } catch (error) {
      console.error("[ERROR] Debug check failed:", error);
      return res.status(500).json({ 
        message: "Debug check failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Temporary route for creating tables without authentication
  app.post("/api/tables/temp", validateRequest(insertTableSchema, 'body'), async (req, res) => {
    try {
      console.log("[DEBUG] Creating table with data:", req.body);
      
      // Validate required fields
      if (!req.body.tableNumber || !req.body.floorNumber) {
        console.error("[ERROR] Missing required fields:", req.body);
        return res.status(400).json({ 
          message: "Missing required fields",
          error: "tableNumber and floorNumber are required",
          receivedData: req.body
        });
      }

      // Ensure numeric values are integers
      const tableData = {
        tableNumber: parseInt(String(req.body.tableNumber)),
        floorNumber: parseInt(String(req.body.floorNumber)),
        qrCodeUrl: req.body.qrCodeUrl || `/table/${req.body.tableNumber}`,
        status: "available" as const
      };

      console.log("[DEBUG] Processed table data:", tableData);
      
      try {
        // Get the default restaurant ID
        const defaultRestaurant = await storage.getDefaultRestaurant();
        if (!defaultRestaurant) {
          throw new Error("No default restaurant found");
        }

        const newTable = await storage.createTable(defaultRestaurant.id, tableData);
        
        if (!newTable) {
          console.error("[ERROR] No table returned from storage");
          throw new Error("Failed to create table: No table returned from storage");
        }
        
        console.log("[DEBUG] Created table:", newTable);
        res.status(201).json(newTable);
      } catch (dbError) {
        console.error("[ERROR] Database error creating table:", dbError);
        throw dbError;
      }
    } catch (error) {
      console.error("[ERROR] Failed to create table:", error);
      res.status(500).json({ 
        message: "Failed to create table",
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Temporary route for creating table configs without authentication
  app.post("/api/table-configs/temp", validateRequest(insertTableConfigSchema, 'body'), async (req, res) => {
    try {
      console.log("[DEBUG] Creating table config with data:", req.body);
      
      // Validate required fields
      if (!req.body.tableId || !req.body.floorPlanId) {
        console.error("[ERROR] Missing required fields:", req.body);
        return res.status(400).json({ 
          message: "Missing required fields",
          error: "tableId and floorPlanId are required",
          receivedData: req.body
        });
      }

      // Ensure numeric values are integers
      const tableConfigData = {
        tableId: parseInt(String(req.body.tableId)),
        floorPlanId: parseInt(String(req.body.floorPlanId)),
        xPosition: parseInt(String(req.body.xPosition)),
        yPosition: parseInt(String(req.body.yPosition)),
        width: parseInt(String(req.body.width)),
        height: parseInt(String(req.body.height)),
        shape: req.body.shape,
        seats: parseInt(String(req.body.seats)),
        isActive: true
      };

      console.log("[DEBUG] Processed table config data:", tableConfigData);
      
      try {
        const newTableConfig = await storage.createTableConfig(tableConfigData);
        
        if (!newTableConfig) {
          console.error("[ERROR] No table config returned from storage");
          throw new Error("Failed to create table config: No table config returned from storage");
        }
        
        console.log("[DEBUG] Created table config:", newTableConfig);
        res.status(201).json(newTableConfig);
      } catch (dbError) {
        console.error("[ERROR] Database error creating table config:", dbError);
        throw dbError;
      }
    } catch (error) {
      console.error("[ERROR] Failed to create table config:", error);
      res.status(500).json({ 
        message: "Failed to create table config",
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // New endpoint for fetching tables by floor
  app.get("/api/tables-by-floor", requireAdmin, async (req, res) => {
    try {
      const { restaurantId, floorNumber } = req.query;
      
      if (!restaurantId || !floorNumber) {
        return res.status(400).json({ message: "Restaurant ID and floor number are required" });
      }

      const tables = await storage.getTablesByFloor(Number(restaurantId), Number(floorNumber));
      res.json(tables);
    } catch (error) {
      console.error("Failed to fetch tables by floor:", error);
      res.status(500).json({ message: "Failed to fetch tables by floor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
