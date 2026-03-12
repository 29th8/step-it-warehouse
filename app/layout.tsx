// app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/context/sidebar-context";
import { Sidebar } from "@/components/layout/sidebar";
import { MainLayoutWrapper } from "@/components/layout/main-layout-wrapper";
// import { AuthProvider } from "@/components/providers/auth-provider"; // Đã có từ bước trước
import { ToastProvider } from "@/components/common/toast-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
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
          <ToastProvider> {/* <--- BỌC ToastProvider Ở ĐÂY */}
            <TooltipProvider>
              <SidebarProvider>
                <div className="flex">
                  <Sidebar />
                  <MainLayoutWrapper>
                    {children}
                  </MainLayoutWrapper>
                </div>
              </SidebarProvider>
            </TooltipProvider>
            <Toaster richColors position="top-right" />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}