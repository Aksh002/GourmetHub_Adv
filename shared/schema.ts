import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("customer")
});

// Table model
export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  tableNumber: integer("table_number").notNull(),
  floorNumber: integer("floor_number").notNull(),
  qrCodeUrl: text("qr_code_url")
});

// Menu Item model
export const menuItemCategories = [
  "all",
  "starters",
  "main_course",
  "desserts",
  "beverages",
  "specials"
] as const;

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // in cents
  available: boolean("available").notNull().default(true),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  tags: text("tags").array()
});

// Order status enum
export const orderStatusEnum = pgEnum("order_status", [
  "placed",
  "under_process",
  "served",
  "completed",
  "paid"
]);

// Order model
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  tableId: integer("table_id").references(() => tables.id).notNull(),
  status: orderStatusEnum("status").notNull().default("placed"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Order Item model
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  menuItemId: integer("menu_item_id").references(() => menuItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull() // price at time of order in cents
});

// Payment model
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  amount: integer("amount").notNull(), // in cents
  status: text("status").notNull().default("pending"),
  paymentUrl: text("payment_url"),
  paidAt: timestamp("paid_at")
});

// Restaurant Setup models
export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  website: text("website"),
  logo: text("logo"),
  currency: text("currency").notNull().default("USD"),
  isConfigured: boolean("is_configured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Operating Hours model
export const operatingHours = pgTable("operating_hours", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  openTime: text("open_time").notNull(),  // Format: HH:MM in 24-hour format
  closeTime: text("close_time").notNull(), // Format: HH:MM in 24-hour format
  isClosed: boolean("is_closed").notNull().default(false)
});

// Floor Plan model
export const floorPlans = pgTable("floor_plans", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  floorNumber: integer("floor_number").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  width: integer("width").notNull(), // dimensions in grid units
  height: integer("height").notNull(), // dimensions in grid units
  isActive: boolean("is_active").notNull().default(true)
});

// Table Config model (extends the basic table model with layout information)
export const tableConfigs = pgTable("table_configs", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").references(() => tables.id).notNull(),
  floorPlanId: integer("floor_plan_id").references(() => floorPlans.id).notNull(),
  xPosition: integer("x_position").notNull(), // grid position x
  yPosition: integer("y_position").notNull(), // grid position y
  width: integer("width").notNull().default(1), // size in grid units
  height: integer("height").notNull().default(1), // size in grid units
  shape: text("shape").notNull().default("rectangle"), // rectangle, round, etc.
  seats: integer("seats").notNull().default(4),
  isActive: boolean("is_active").notNull().default(true)
});

// Zod schemas for validating data
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true
});

export const insertTableSchema = createInsertSchema(tables).pick({
  tableNumber: true,
  floorNumber: true,
  qrCodeUrl: true
});

export const insertMenuItemSchema = createInsertSchema(menuItems).pick({
  name: true,
  description: true,
  price: true,
  available: true,
  category: true,
  imageUrl: true,
  tags: true
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  userId: true,
  tableId: true,
  status: true
});

export const insertOrderItemSchema = createInsertSchema(orderItems).pick({
  orderId: true,
  menuItemId: true,
  quantity: true,
  price: true
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  orderId: true,
  amount: true,
  status: true,
  paymentUrl: true
});

// Restaurant setup schemas
export const insertRestaurantSchema = createInsertSchema(restaurants).pick({
  name: true,
  description: true,
  address: true,
  phone: true,
  email: true,
  website: true,
  logo: true,
  currency: true,
  isConfigured: true
});

export const insertOperatingHoursSchema = createInsertSchema(operatingHours).pick({
  restaurantId: true,
  dayOfWeek: true,
  openTime: true,
  closeTime: true,
  isClosed: true
});

export const insertFloorPlanSchema = createInsertSchema(floorPlans).pick({
  restaurantId: true,
  floorNumber: true,
  name: true,
  description: true,
  width: true,
  height: true,
  isActive: true
});

export const insertTableConfigSchema = createInsertSchema(tableConfigs).pick({
  tableId: true,
  floorPlanId: true,
  xPosition: true,
  yPosition: true,
  width: true,
  height: true,
  shape: true,
  seats: true,
  isActive: true
});

// Cart item type
export const cartItemSchema = z.object({
  menuItemId: z.number(),
  quantity: z.number().min(1),
  name: z.string(),
  price: z.number()
});

// Update order status schema
export const updateOrderStatusSchema = z.object({
  status: z.enum(["placed", "under_process", "served", "completed", "paid"])
});

// Types
// Base entity types
export type User = typeof users.$inferSelect;
export type Table = typeof tables.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Restaurant = typeof restaurants.$inferSelect;
export type OperatingHours = typeof operatingHours.$inferSelect;
export type FloorPlan = typeof floorPlans.$inferSelect;
export type TableConfig = typeof tableConfigs.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTable = z.infer<typeof insertTableSchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type InsertOperatingHours = z.infer<typeof insertOperatingHoursSchema>;
export type InsertFloorPlan = z.infer<typeof insertFloorPlanSchema>;
export type InsertTableConfig = z.infer<typeof insertTableConfigSchema>;

// Extended and combined types
export type CartItem = z.infer<typeof cartItemSchema>;
export type OrderWithItems = Order & { items: (OrderItem & { menuItem: MenuItem })[] };
export type TableWithOrder = Table & { order?: OrderWithItems };
export type TableWithConfig = Table & { config: TableConfig };
export type FloorPlanWithTables = FloorPlan & { tables: TableWithConfig[] };
export type RestaurantWithDetails = Restaurant & { 
  operatingHours: OperatingHours[],
  floorPlans: FloorPlanWithTables[]
};
