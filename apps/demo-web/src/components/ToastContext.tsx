"use client";

import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import type { ReactNode } from "react";

export type ToastKind = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description: string;
  createdAt: number;
  read: boolean;
}

interface ToastState {
  queue: ToastItem[];      // visible queue (max 3)
  history: ToastItem[];    // recent 20, including dismissed
  unreadCount: number;
}

type ToastAction =
  | { type: "ADD"; item: ToastItem }
  | { type: "DISMISS"; id: number }
  | { type: "MARK_READ_ALL" }
  | { type: "CLEAR_HISTORY" };

let nextId = 1;

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD": {
      const queue = [...state.queue, action.item].slice(-3);
      const history = [action.item, ...state.history].slice(0, 20);
      return { queue, history, unreadCount: state.unreadCount + 1 };
    }
    case "DISMISS": {
      const queue = state.queue.filter((t) => t.id !== action.id);
      return { ...state, queue };
    }
    case "MARK_READ_ALL": {
      const history = state.history.map((t) => ({ ...t, read: true }));
      return { ...state, history, unreadCount: 0 };
    }
    case "CLEAR_HISTORY": {
      return { ...state, history: [], unreadCount: 0 };
    }
    default:
      return state;
  }
}

interface ToastContextValue {
  queue: ToastItem[];
  history: ToastItem[];
  unreadCount: number;
  toast: (kind: ToastKind, title: string, description?: string) => void;
  dismiss: (id: number) => void;
  markAllRead: () => void;
  clearHistory: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  queue: [],
  history: [],
  unreadCount: 0,
  toast: () => {},
  dismiss: () => {},
  markAllRead: () => {},
  clearHistory: () => {}
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { queue: [], history: [], unreadCount: 0 });

  const toast = useCallback((kind: ToastKind, title: string, description = "") => {
    const item: ToastItem = {
      id: nextId++,
      kind,
      title,
      description,
      createdAt: Date.now(),
      read: false
    };
    dispatch({ type: "ADD", item });
  }, []);

  const dismiss = useCallback((id: number) => {
    dispatch({ type: "DISMISS", id });
  }, []);

  const markAllRead = useCallback(() => {
    dispatch({ type: "MARK_READ_ALL" });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: "CLEAR_HISTORY" });
  }, []);

  const value = useMemo(
    () => ({ ...state, toast, dismiss, markAllRead, clearHistory }),
    [state, toast, dismiss, markAllRead, clearHistory]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  return useContext(ToastContext);
}
