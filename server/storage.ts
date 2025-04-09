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

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: number, newPassword: string): Promise<User | undefined>;
  
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

  // Restaurant Setup methods
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getDefaultRestaurant(): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: number, restaurant: Partial<Restaurant>): Promise<Restaurant | undefined>;
  getRestaurantWithDetails(id: number): Promise<RestaurantWithDetails | undefined>;
  
  // Operating Hours methods
  getOperatingHours(id: number): Promise<OperatingHours | undefined>;
  getOperatingHoursByRestaurant(restaurantId: number): Promise<OperatingHours[]>;
  createOperatingHours(hours: InsertOperatingHours): Promise<OperatingHours>;
  updateOperatingHours(id: number, hours: Partial<OperatingHours>): Promise<OperatingHours | undefined>;
  deleteOperatingHours(id: number): Promise<boolean>;
  
  // Floor Plan methods
  getFloorPlan(id: number): Promise<FloorPlan | undefined>;
  getFloorPlansByRestaurant(restaurantId: number): Promise<FloorPlan[]>;
  createFloorPlan(floorPlan: InsertFloorPlan): Promise<FloorPlan>;
  updateFloorPlan(id: number, floorPlan: Partial<FloorPlan>): Promise<FloorPlan | undefined>;
  deleteFloorPlan(id: number): Promise<boolean>;
  getFloorPlanWithTables(id: number): Promise<FloorPlanWithTables | undefined>;
  
  // Table Config methods
  getTableConfig(id: number): Promise<TableConfig | undefined>;
  getTableConfigByTable(tableId: number): Promise<TableConfig | undefined>;
  getTableConfigsByFloorPlan(floorPlanId: number): Promise<TableConfig[]>;
  createTableConfig(tableConfig: InsertTableConfig): Promise<TableConfig>;
  updateTableConfig(id: number, tableConfig: Partial<TableConfig>): Promise<TableConfig | undefined>;
  deleteTableConfig(id: number): Promise<boolean>;
  getTableWithConfig(tableId: number): Promise<TableWithConfig | undefined>;

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
  private restaurants: Map<number, Restaurant>;
  private operatingHours: Map<number, OperatingHours>;
  private floorPlans: Map<number, FloorPlan>;
  private tableConfigs: Map<number, TableConfig>;
  sessionStore: session.Store;
  
  private currentUserId: number;
  private currentTableId: number;
  private currentMenuItemId: number;
  private currentOrderId: number;
  private currentOrderItemId: number;
  private currentPaymentId: number;
  private currentRestaurantId: number;
  private currentOperatingHoursId: number;
  private currentFloorPlanId: number;
  private currentTableConfigId: number;

  constructor() {
    this.users = new Map();
    this.tables = new Map();
    this.menuItems = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.payments = new Map();
    this.restaurants = new Map();
    this.operatingHours = new Map();
    this.floorPlans = new Map();
    this.tableConfigs = new Map();
    
    this.currentUserId = 1;
    this.currentTableId = 1;
    this.currentMenuItemId = 1;
    this.currentOrderId = 1;
    this.currentOrderItemId = 1;
    this.currentPaymentId = 1;
    this.currentRestaurantId = 1;
    this.currentOperatingHoursId = 1;
    this.currentFloorPlanId = 1;
    this.currentTableConfigId = 1;

    // Setup session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Setup initial data (initialize immediately)
    this.initializeData().catch(err => {
      console.error("Failed to initialize data:", err);
    });
  }

  // Initialize with sample data for development
  private async initializeData() {
    // Create admin user with plaintext password
    this.createUser({
      username: "admin",
      password: "admin", // In a real app, we'd use hashed passwords
      name: "Restaurant Manager",
      email: "admin@restaurant.com",
      role: "admin"
    });

    // Create customer user with plaintext password
    this.createUser({
      username: "customer",
      password: "customer", // In a real app, we'd use hashed passwords
      name: "John Customer",
      email: "customer@example.com",
      role: "customer"
    });
    
    // Alternative accounts
    this.createUser({
      username: "admin@123",
      password: "admin@123",
      name: "Admin User",
      email: "admin@example.com",
      role: "admin"
    });
    
    this.createUser({
      username: "customer@123",
      password: "customer@123",
      name: "Customer User",
      email: "customer@example.com",
      role: "customer"
    });

    // Create a default restaurant
    const restaurant = await this.createRestaurant({
      name: "Gourmet Fusion",
      description: "A fine dining experience with a fusion of international cuisines",
      address: "123 Culinary Street, Flavorville",
      phone: "+1 (555) 123-4567",
      email: "contact@gourmetfusion.com",
      website: "https://gourmetfusion.com",
      logo: "/logo.png",
      currency: "USD",
      isConfigured: false
    });

    // Create operating hours
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (let day = 0; day < 7; day++) {
      await this.createOperatingHours({
        restaurantId: restaurant.id,
        dayOfWeek: day,
        openTime: day === 0 ? "10:00" : "08:00", // Opens later on Sunday
        closeTime: day < 5 ? "22:00" : "23:00", // Open later on Friday and Saturday
        isClosed: day === 0 // Closed on Sunday
      });
    }

    // Create floor plans
    const floor1 = await this.createFloorPlan({
      restaurantId: restaurant.id,
      floorNumber: 1,
      name: "Main Dining",
      description: "Main dining area on the ground floor",
      width: 20,
      height: 15,
      isActive: true
    });

    const floor2 = await this.createFloorPlan({
      restaurantId: restaurant.id,
      floorNumber: 2,
      name: "Private Dining",
      description: "Private dining rooms and event space",
      width: 15,
      height: 10,
      isActive: true
    });

    // Create tables
    for (let floor = 1; floor <= 2; floor++) {
      const floorPlanId = floor === 1 ? floor1.id : floor2.id;
      
      for (let tableNum = 1; tableNum <= 12; tableNum++) {
        // Create basic table
        const table = await this.createTable({
          tableNumber: tableNum,
          floorNumber: floor,
          qrCodeUrl: `/table/${floor}/${tableNum}`
        });
        
        // Create table configuration
        // Position tables in a grid pattern with some spacing
        const row = Math.floor((tableNum - 1) / 4);
        const col = (tableNum - 1) % 4;
        
        await this.createTableConfig({
          tableId: table.id,
          floorPlanId: floorPlanId,
          xPosition: col * 5 + 2, // Space tables horizontally
          yPosition: row * 5 + 2, // Space tables vertically
          width: 3, // Table width in grid units
          height: 3, // Table height in grid units
          shape: tableNum % 3 === 0 ? "round" : "rectangle", // Mix of table shapes
          seats: tableNum % 5 === 0 ? 6 : 4, // Mix of table sizes
          isActive: true
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
    // Ensure role is never undefined
    const role = insertUser.role || "customer";
    const user: User = { ...insertUser, id, role };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserPassword(id: number, newPassword: string): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, password: newPassword };
    this.users.set(id, updatedUser);
    return updatedUser;
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
    const qrCodeUrl = insertTable.qrCodeUrl || null;
    const table: Table = { ...insertTable, id, qrCodeUrl };
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
    // Set default values for optional fields
    const available = insertMenuItem.available !== undefined ? insertMenuItem.available : true;
    const imageUrl = insertMenuItem.imageUrl || null;
    const tags = insertMenuItem.tags || null;
    
    const menuItem: MenuItem = { 
      ...insertMenuItem, 
      id, 
      available, 
      imageUrl, 
      tags 
    };
    
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
    // Set default values for required fields
    const status = insertOrder.status || "placed";
    const userId = insertOrder.userId !== undefined ? insertOrder.userId : null;
    
    const order: Order = { 
      ...insertOrder, 
      id, 
      status,
      userId,
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
    // Set default values for optional fields
    const status = insertPayment.status || "pending";
    const paymentUrl = insertPayment.paymentUrl || null;
    
    const payment: Payment = { 
      ...insertPayment, 
      id,
      status,
      paymentUrl,
      paidAt: status === "paid" ? new Date() : null
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

  // Restaurant Setup methods
  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    return this.restaurants.get(id);
  }

  async getDefaultRestaurant(): Promise<Restaurant | undefined> {
    // Return the first restaurant or the one marked as default if we had that field
    return Array.from(this.restaurants.values())[0];
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const id = this.currentRestaurantId++;
    // Set default values for optional fields
    const description = restaurant.description || null;
    const email = restaurant.email || null;
    const website = restaurant.website || null;
    const logo = restaurant.logo || null;
    const currency = restaurant.currency || "USD";
    const isConfigured = restaurant.isConfigured !== undefined ? restaurant.isConfigured : false;
    
    const newRestaurant: Restaurant = {
      ...restaurant,
      id,
      description,
      email,
      website,
      logo,
      currency,
      isConfigured,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.restaurants.set(id, newRestaurant);
    return newRestaurant;
  }

  async updateRestaurant(id: number, restaurantUpdates: Partial<Restaurant>): Promise<Restaurant | undefined> {
    const restaurant = await this.getRestaurant(id);
    if (!restaurant) return undefined;

    const updatedRestaurant = { 
      ...restaurant, 
      ...restaurantUpdates,
      updatedAt: new Date()
    };
    this.restaurants.set(id, updatedRestaurant);
    return updatedRestaurant;
  }

  async getRestaurantWithDetails(id: number): Promise<RestaurantWithDetails | undefined> {
    const restaurant = await this.getRestaurant(id);
    if (!restaurant) return undefined;

    const operatingHours = await this.getOperatingHoursByRestaurant(id);
    const floorPlans = await Promise.all(
      (await this.getFloorPlansByRestaurant(id)).map(async plan => {
        const tableConfigs = await this.getTableConfigsByFloorPlan(plan.id);
        const tablesWithConfigs = await Promise.all(
          tableConfigs.map(async config => {
            const table = await this.getTable(config.tableId);
            return { ...(table as Table), config };
          })
        );
        return { ...plan, tables: tablesWithConfigs };
      })
    );

    return { ...restaurant, operatingHours, floorPlans };
  }

  // Operating Hours methods
  async getOperatingHours(id: number): Promise<OperatingHours | undefined> {
    return this.operatingHours.get(id);
  }

  async getOperatingHoursByRestaurant(restaurantId: number): Promise<OperatingHours[]> {
    return Array.from(this.operatingHours.values())
      .filter(hours => hours.restaurantId === restaurantId)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  async createOperatingHours(hours: InsertOperatingHours): Promise<OperatingHours> {
    const id = this.currentOperatingHoursId++;
    // Set default values for optional fields
    const isClosed = hours.isClosed !== undefined ? hours.isClosed : false;
    
    const operatingHours: OperatingHours = {
      ...hours,
      id,
      isClosed
    };
    
    this.operatingHours.set(id, operatingHours);
    return operatingHours;
  }

  async updateOperatingHours(id: number, hoursUpdates: Partial<OperatingHours>): Promise<OperatingHours | undefined> {
    const hours = await this.getOperatingHours(id);
    if (!hours) return undefined;

    const updatedHours = { ...hours, ...hoursUpdates };
    this.operatingHours.set(id, updatedHours);
    return updatedHours;
  }

  async deleteOperatingHours(id: number): Promise<boolean> {
    return this.operatingHours.delete(id);
  }

  // Floor Plan methods
  async getFloorPlan(id: number): Promise<FloorPlan | undefined> {
    return this.floorPlans.get(id);
  }

  async getFloorPlansByRestaurant(restaurantId: number): Promise<FloorPlan[]> {
    return Array.from(this.floorPlans.values())
      .filter(plan => plan.restaurantId === restaurantId)
      .sort((a, b) => a.floorNumber - b.floorNumber);
  }

  async createFloorPlan(floorPlan: InsertFloorPlan): Promise<FloorPlan> {
    const id = this.currentFloorPlanId++;
    // Set default values for optional fields
    const description = floorPlan.description || null;
    const isActive = floorPlan.isActive !== undefined ? floorPlan.isActive : true;
    
    const newFloorPlan: FloorPlan = {
      ...floorPlan,
      id,
      description,
      isActive
    };
    
    this.floorPlans.set(id, newFloorPlan);
    return newFloorPlan;
  }

  async updateFloorPlan(id: number, floorPlanUpdates: Partial<FloorPlan>): Promise<FloorPlan | undefined> {
    const floorPlan = await this.getFloorPlan(id);
    if (!floorPlan) return undefined;

    const updatedFloorPlan = { ...floorPlan, ...floorPlanUpdates };
    this.floorPlans.set(id, updatedFloorPlan);
    return updatedFloorPlan;
  }

  async deleteFloorPlan(id: number): Promise<boolean> {
    return this.floorPlans.delete(id);
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
    return this.tableConfigs.get(id);
  }

  async getTableConfigByTable(tableId: number): Promise<TableConfig | undefined> {
    return Array.from(this.tableConfigs.values())
      .find(config => config.tableId === tableId);
  }

  async getTableConfigsByFloorPlan(floorPlanId: number): Promise<TableConfig[]> {
    return Array.from(this.tableConfigs.values())
      .filter(config => config.floorPlanId === floorPlanId);
  }

  async createTableConfig(tableConfig: InsertTableConfig): Promise<TableConfig> {
    const id = this.currentTableConfigId++;
    // Set default values for optional fields
    const width = tableConfig.width !== undefined ? tableConfig.width : 1;
    const height = tableConfig.height !== undefined ? tableConfig.height : 1;
    const shape = tableConfig.shape || "rectangle";
    const seats = tableConfig.seats !== undefined ? tableConfig.seats : 4;
    const isActive = tableConfig.isActive !== undefined ? tableConfig.isActive : true;
    
    const newTableConfig: TableConfig = {
      ...tableConfig,
      id,
      width,
      height,
      shape,
      seats,
      isActive
    };
    
    this.tableConfigs.set(id, newTableConfig);
    return newTableConfig;
  }

  async updateTableConfig(id: number, tableConfigUpdates: Partial<TableConfig>): Promise<TableConfig | undefined> {
    const tableConfig = await this.getTableConfig(id);
    if (!tableConfig) return undefined;

    const updatedTableConfig = { ...tableConfig, ...tableConfigUpdates };
    this.tableConfigs.set(id, updatedTableConfig);
    return updatedTableConfig;
  }

  async deleteTableConfig(id: number): Promise<boolean> {
    return this.tableConfigs.delete(id);
  }

  async getTableWithConfig(tableId: number): Promise<TableWithConfig | undefined> {
    const table = await this.getTable(tableId);
    if (!table) return undefined;

    const tableConfig = await this.getTableConfigByTable(tableId);
    if (!tableConfig) return undefined;

    return { ...table, config: tableConfig };
  }
}

export const storage = new MemStorage();
