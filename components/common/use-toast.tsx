// components/common/use-toast.tsx

"use client";

import { ToastContextType } from '../common/toast-provider'; // Import kiểu dữ liệu từ provider
import React, { useContext, createContext } from "react";
// Tạo một Context API để sử dụng hàm addToast
const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

// Hook tùy chỉnh để sử dụng Toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Bắt buộc phải bọc ToastProvider ở trên cây Component
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}