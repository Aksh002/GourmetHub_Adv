import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
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
export type User = typeof users.$inferSelect;
export type Table = typeof tables.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTable = z.infer<typeof insertTableSchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type CartItem = z.infer<typeof cartItemSchema>;
export type OrderWithItems = Order & { items: (OrderItem & { menuItem: MenuItem })[] };
export type TableWithOrder = Table & { order?: OrderWithItems };
