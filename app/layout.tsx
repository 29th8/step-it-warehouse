// app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/common/toast-provider";
import { Toaster } from "sonner";
import { classNames } from "@/lib/utils";
import AuthProvider from "@/components/session-provider";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "Step IT Warehouse Management",
  description: "Hệ thống quản lý kho vật tư IT nội bộ cho Step Company",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={classNames(inter.className, "bg-slate-50")}>
        <AuthProvider>
          <ToastProvider>
            {children}
            <Toaster richColors position="top-right" />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}