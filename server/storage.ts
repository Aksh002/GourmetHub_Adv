import { users, tables, menuItems, orders, orderItems, payments, 
  type User, type InsertUser, type Table, type InsertTable, 
  type MenuItem, type InsertMenuItem, type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem, type Payment, type InsertPayment, 
  type OrderWithItems, type TableWithOrder } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Table methods
  getTable(id: number): Promise<Table | undefined>;
  getTables(): Promise<Table[]>;
  getTablesByFloor(floorNumber: number): Promise<Table[]>;
  createTable(table: InsertTable): Promise<Table>;
  getTableWithOrder(id: number): Promise<TableWithOrder | undefined>;
  getAllTablesWithOrders(): Promise<TableWithOrder[]>;
  
  // Menu methods
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  getMenuItems(categoryFilter?: string): Promise<MenuItem[]>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, menuItem: Partial<MenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: Order["status"]): Promise<Order | undefined>;
  getOrdersWithItems(): Promise<OrderWithItems[]>;
  getOrderWithItems(id: number): Promise<OrderWithItems | undefined>;
  getOrdersByStatus(status: Order["status"]): Promise<OrderWithItems[]>;
  getActiveOrderForTable(tableId: number): Promise<OrderWithItems | undefined>;
  
  // Order item methods
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  
  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByOrderId(orderId: number): Promise<Payment | undefined>;
  updatePaymentStatus(id: number, status: string): Promise<Payment | undefined>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tables: Map<number, Table>;
  private menuItems: Map<number, MenuItem>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  private payments: Map<number, Payment>;
  sessionStore: session.Store;
  
  private currentUserId: number;
  private currentTableId: number;
  private currentMenuItemId: number;
  private currentOrderId: number;
  private currentOrderItemId: number;
  private currentPaymentId: number;

  constructor() {
    this.users = new Map();
    this.tables = new Map();
    this.menuItems = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.payments = new Map();
    
    this.currentUserId = 1;
    this.currentTableId = 1;
    this.currentMenuItemId = 1;
    this.currentOrderId = 1;
    this.currentOrderItemId = 1;
    this.currentPaymentId = 1;

    // Setup initial data
    this.initializeData();

    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // Initialize with sample data for development
  private initializeData() {
    // Create admin user
    this.createUser({
      username: "admin",
      password: "admin",
      name: "Restaurant Manager",
      email: "admin@restaurant.com",
      role: "admin"
    });

    // Create customer user
    this.createUser({
      username: "customer",
      password: "customer",
      name: "John Customer",
      email: "customer@example.com",
      role: "customer"
    });

    // Create tables
    for (let floor = 1; floor <= 2; floor++) {
      for (let tableNum = 1; tableNum <= 12; tableNum++) {
        this.createTable({
          tableNumber: tableNum,
          floorNumber: floor,
          qrCodeUrl: `/table/${floor}/${tableNum}`
        });
      }
    }

    // Create menu items
    const categories = ["starters", "main_course", "desserts", "beverages", "specials"];
    const menuItems = [
      {
        name: "Mediterranean Salad",
        description: "Fresh vegetables with feta cheese, olives, and our special dressing",
        price: 1299, // $12.99
        category: "starters",
        available: true,
        tags: ["vegetarian", "healthy"]
      },
      {
        name: "Pepperoni Pizza",
        description: "Hand-tossed crust with our signature sauce, mozzarella and pepperoni",
        price: 1499, // $14.99
        category: "main_course",
        available: true,
        tags: ["popular"]
      },
      {
        name: "Gourmet Burger",
        description: "Premium beef patty with cheese, caramelized onions and our secret sauce",
        price: 1699, // $16.99
        category: "main_course",
        available: true,
        tags: ["chef's special"]
      },
      {
        name: "Chocolate Lava Cake",
        description: "Warm chocolate cake with a gooey center, served with vanilla ice cream",
        price: 899, // $8.99
        category: "desserts",
        available: true,
        tags: []
      },
      {
        name: "Fresh Lemonade",
        description: "Freshly squeezed lemons with a hint of mint",
        price: 499, // $4.99
        category: "beverages",
        available: true,
        tags: ["refreshing"]
      }
    ];

    menuItems.forEach(item => {
      this.createMenuItem({
        ...item,
        imageUrl: ""
      });
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Table methods
  async getTable(id: number): Promise<Table | undefined> {
    return this.tables.get(id);
  }

  async getTables(): Promise<Table[]> {
    return Array.from(this.tables.values());
  }
  
  async getTablesByFloor(floorNumber: number): Promise<Table[]> {
    return Array.from(this.tables.values())
      .filter(table => table.floorNumber === floorNumber);
  }

  async createTable(insertTable: InsertTable): Promise<Table> {
    const id = this.currentTableId++;
    const table: Table = { ...insertTable, id };
    this.tables.set(id, table);
    return table;
  }

  async getTableWithOrder(id: number): Promise<TableWithOrder | undefined> {
    const table = await this.getTable(id);
    if (!table) return undefined;

    const order = await this.getActiveOrderForTable(id);
    return { ...table, order };
  }

  async getAllTablesWithOrders(): Promise<TableWithOrder[]> {
    const tables = await this.getTables();
    return Promise.all(
      tables.map(async (table) => {
        const order = await this.getActiveOrderForTable(table.id);
        return { ...table, order };
      })
    );
  }

  // Menu item methods
  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async getMenuItems(categoryFilter?: string): Promise<MenuItem[]> {
    let items = Array.from(this.menuItems.values());
    
    if (categoryFilter && categoryFilter !== "all") {
      items = items.filter(item => item.category === categoryFilter);
    }
    
    return items;
  }

  async createMenuItem(insertMenuItem: InsertMenuItem): Promise<MenuItem> {
    const id = this.currentMenuItemId++;
    const menuItem: MenuItem = { ...insertMenuItem, id };
    this.menuItems.set(id, menuItem);
    return menuItem;
  }

  async updateMenuItem(id: number, menuItemUpdates: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const menuItem = await this.getMenuItem(id);
    if (!menuItem) return undefined;

    const updatedMenuItem = { ...menuItem, ...menuItemUpdates };
    this.menuItems.set(id, updatedMenuItem);
    return updatedMenuItem;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    return this.menuItems.delete(id);
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const order: Order = { 
      ...insertOrder, 
      id, 
      createdAt: new Date() 
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: number, status: Order["status"]): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order) return undefined;

    const updatedOrder = { ...order, status };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async getOrdersWithItems(): Promise<OrderWithItems[]> {
    const orders = await this.getOrders();
    return Promise.all(
      orders.map(async (order) => {
        const orderItems = await this.getOrderItems(order.id);
        const itemsWithMenuItems = await Promise.all(
          orderItems.map(async (item) => {
            const menuItem = await this.getMenuItem(item.menuItemId);
            return { ...item, menuItem: menuItem! };
          })
        );
        return { ...order, items: itemsWithMenuItems };
      })
    );
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

  async getOrdersByStatus(status: Order["status"]): Promise<OrderWithItems[]> {
    const orders = await this.getOrdersWithItems();
    return orders.filter(order => order.status === status);
  }

  async getActiveOrderForTable(tableId: number): Promise<OrderWithItems | undefined> {
    const activeStatuses = ["placed", "under_process", "served", "completed"];
    const orders = await this.getOrdersWithItems();
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
    const id = this.currentOrderItemId++;
    const orderItem: OrderItem = { ...insertOrderItem, id };
    this.orderItems.set(id, orderItem);
    return orderItem;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values())
      .filter(item => item.orderId === orderId);
  }

  // Payment methods
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    const payment: Payment = { 
      ...insertPayment, 
      id,
      paidAt: insertPayment.status === "paid" ? new Date() : null
    };
    this.payments.set(id, payment);
    return payment;
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentByOrderId(orderId: number): Promise<Payment | undefined> {
    return Array.from(this.payments.values())
      .find(payment => payment.orderId === orderId);
  }

  async updatePaymentStatus(id: number, status: string): Promise<Payment | undefined> {
    const payment = await this.getPayment(id);
    if (!payment) return undefined;

    const updatedPayment = { 
      ...payment, 
      status,
      paidAt: status === "paid" ? new Date() : payment.paidAt
    };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }
}

export const storage = new MemStorage();
