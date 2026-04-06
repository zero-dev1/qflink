import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number; // ms, 0 = never auto-dismiss
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info: 4000,  // QDL spec says 4s for info
  warning: 0,  // QDL spec: no auto-dismiss
  error: 0,    // QDL spec: no auto-dismiss
};

const MAX_TOASTS = 3;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (type, message, duration) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const resolvedDuration = duration ?? DEFAULT_DURATIONS[type];

    set((state) => {
      const next = [...state.toasts, { id, type, message, duration: resolvedDuration }];
      // Enforce max 3: remove oldest
      while (next.length > MAX_TOASTS) next.shift();
      return { toasts: next };
    });

    // Auto-dismiss
    if (resolvedDuration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, resolvedDuration);
    }
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
