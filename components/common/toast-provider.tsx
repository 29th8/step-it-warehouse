// components/common/toast-provider.tsx

"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { classNames } from '@/lib/utils';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export interface ToastContextType {
  addToast: (message: string, type?: ToastMessage['type']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => removeToast(toasts[0].id), 5000); // Tự động đóng sau 5s
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={classNames(
              "p-4 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 transform",
              "flex items-center gap-2",
              toast.type === 'success' && "bg-green-500 text-white",
              toast.type === 'error' && "bg-red-500 text-white",
              toast.type === 'warning' && "bg-yellow-500 text-white",
              toast.type === 'info' && "bg-blue-500 text-white"
            )}
            onClick={() => removeToast(toast.id)} // Click để đóng
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}