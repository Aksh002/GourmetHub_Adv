import { useState } from "react";

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  type?: "success" | "error" | "warning" | "info";
  variant?: "default" | "destructive";
}

interface Toast extends ToastOptions {
  id: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (options: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000,
      type: "info",
      variant: "default",
      ...options,
    };

    setToasts((prev) => [...prev, newToast]);

    if (newToast.duration !== Infinity) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    }
  };

  return { toast, toasts };
} 