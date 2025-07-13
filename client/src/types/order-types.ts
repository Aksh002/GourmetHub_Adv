export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  available: boolean;
  category: string;
  imageUrl?: string;
  tags?: string[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  menuItemId: number;
  quantity: number;
  notes?: string;
  status: "pending" | "preparing" | "ready" | "served";
  menuItem: MenuItem;
}

export interface Order {
  id: number;
  tableId: number;
  restaurantId: number;
  userId?: number;
  status: "placed" | "under_process" | "served" | "completed" | "paid";
  items: OrderItem[];
  createdAt: string;
  totalAmount: number;
} 