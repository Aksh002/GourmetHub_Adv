import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `$${(price / 100).toFixed(2)}`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(date));
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  
  if (diff < 60) return `${diff} ${diff === 1 ? 'sec' : 'secs'} ago`;
  
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} ${mins === 1 ? 'min' : 'mins'} ago`;
  
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export const getOrderStatusColor = (status: string) => {
  switch(status) {
    case 'placed': return 'bg-amber-500';
    case 'under_process': return 'bg-blue-500';
    case 'served': return 'bg-green-500';
    case 'completed': return 'bg-red-500';
    case 'paid': return 'bg-gray-500';
    default: return 'bg-gray-400';
  }
};

export const getOrderStatusText = (status: string) => {
  switch(status) {
    case 'placed': return 'Order Placed';
    case 'under_process': return 'Under Process';
    case 'served': return 'Served';
    case 'completed': return 'Awaiting Payment';
    case 'paid': return 'Paid';
    default: return 'Unknown';
  }
};

export const getTableStatusColor = (order?: any) => {
  if (!order) return 'border-gray-400';
  
  switch(order.status) {
    case 'placed': return 'border-amber-500 bg-amber-50';
    case 'under_process': return 'border-blue-500 bg-blue-50';
    case 'served': return 'border-green-500 bg-green-50';
    case 'completed': return 'border-red-500 bg-red-50';
    default: return 'border-gray-400';
  }
};

export const getTableStatusText = (order?: any) => {
  if (!order) return 'Vacant';
  
  switch(order.status) {
    case 'placed': return 'Order Placed';
    case 'under_process': return 'Under Process';
    case 'served': return 'Served';
    case 'completed': return 'Awaiting Payment';
    case 'paid': return 'Paid';
    default: return 'Unknown';
  }
};

export const getTableStatusTextColor = (order?: any) => {
  if (!order) return 'text-gray-500';
  
  switch(order.status) {
    case 'placed': return 'text-amber-500';
    case 'under_process': return 'text-blue-500';
    case 'served': return 'text-green-500';
    case 'completed': return 'text-red-500';
    case 'paid': return 'text-gray-500';
    default: return 'text-gray-500';
  }
};
