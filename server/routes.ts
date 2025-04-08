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
  updateOrderStatusSchema
} from "@shared/schema";
import { ZodError } from "zod";

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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
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
  app.get("/api/tables", async (req, res) => {
    try {
      const tables = await storage.getTables();
      res.json(tables);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tables" });
    }
  });

  app.get("/api/tables/floor/:floorNumber", async (req, res) => {
    try {
      const floorNumber = parseInt(req.params.floorNumber);
      const tables = await storage.getTablesByFloor(floorNumber);
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
      const newTable = await storage.createTable(req.body);
      res.status(201).json(newTable);
    } catch (error) {
      res.status(500).json({ message: "Failed to create table" });
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
      const category = req.query.category as string | undefined;
      const menuItems = await storage.getMenuItems(category);
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
      const newMenuItem = await storage.createMenuItem(req.body);
      res.status(201).json(newMenuItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  app.put("/api/menu-items/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedMenuItem = await storage.updateMenuItem(id, req.body);
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
      const orders = await storage.getOrdersWithItems();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/status/:status", requireAdmin, async (req, res) => {
    try {
      const status = req.params.status as any;
      const orders = await storage.getOrdersByStatus(status);
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
      // Check if there's already an active order for this table
      const activeOrder = await storage.getActiveOrderForTable(req.body.tableId);
      if (activeOrder) {
        return res.status(400).json({ 
          message: "There is already an active order for this table",
          orderId: activeOrder.id
        });
      }

      const newOrder = await storage.createOrder({
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
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
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
        price: menuItem.price
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
            (sum, item) => sum + (item.price * item.quantity), 
            0
          );
          
          // Create payment record
          await storage.createPayment({
            orderId: id,
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
      const { tableId, items } = req.body;
      
      // Validate the cart items
      const validatedItems = items.map((item: any) => cartItemSchema.parse(item));
      
      if (validatedItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }
      
      // Check if there's already an active order for this table
      const activeOrder = await storage.getActiveOrderForTable(tableId);
      if (activeOrder) {
        return res.status(400).json({ 
          message: "There is already an active order for this table",
          orderId: activeOrder.id
        });
      }
      
      // Create the order
      const newOrder = await storage.createOrder({
        tableId,
        userId: req.user.id,
        status: 'placed'
      });
      
      // Add items to the order
      for (const item of validatedItems) {
        const menuItem = await storage.getMenuItem(item.menuItemId);
        if (!menuItem) {
          continue; // Skip if menu item not found
        }
        
        await storage.createOrderItem({
          orderId: newOrder.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: menuItem.price
        });
      }
      
      // Return the complete order with items
      const completeOrder = await storage.getOrderWithItems(newOrder.id);
      res.status(201).json(completeOrder);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid cart data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create order from cart" });
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

  // Analytics API for admin dashboard
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const [orders, tables] = await Promise.all([
        storage.getOrdersWithItems(),
        storage.getAllTablesWithOrders()
      ]);
      
      // Count active orders
      const activeOrders = orders.filter(order => 
        ['placed', 'under_process', 'served'].includes(order.status)
      );
      
      // Count completed orders
      const completedOrders = orders.filter(order => 
        ['completed', 'paid'].includes(order.status)
      );
      
      // Count occupied tables
      const occupiedTables = tables.filter(table => !!table.order);
      
      // Calculate today's revenue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const paidOrders = orders.filter(order => 
        order.status === 'paid' && 
        order.createdAt >= today
      );
      
      const todaysRevenue = paidOrders.reduce((sum, order) => {
        return sum + order.items.reduce((itemSum, item) => 
          itemSum + (item.price * item.quantity), 0);
      }, 0);
      
      res.json({
        activeOrders: activeOrders.length,
        completedOrders: completedOrders.length,
        occupiedTables: occupiedTables.length,
        totalTables: tables.length,
        todaysRevenue
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
