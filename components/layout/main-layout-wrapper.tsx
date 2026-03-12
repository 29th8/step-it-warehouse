"use client";

import { useSidebar } from "@/context/sidebar-context";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className={cn(
      /* 1. min-h-screen đảm bảo thẻ div bọc ngoài luôn cao bằng hoặc hơn màn hình */
      /* 2. flex flex-col thiết lập trục dọc để đẩy các thành phần con */
      "flex-1 flex flex-col min-h-screen transition-all duration-300",
      isCollapsed ? "ml-20" : "ml-64"
    )}>
      
      <Header />
      
      {/* 3. Thêm flex-1 vào <main> 
          Điều này ép phần main phải "giãn nở" (grow) để chiếm TOÀN BỘ 
          không gian trống còn lại giữa Header và Footer. */}
      <main className="flex-1 p-8 animate-in fade-in duration-500">
        {children}
      </main>

      {/* 4. Thêm mt-auto vào <footer>
          Như một lớp bảo vệ kép, mt-auto sẽ đẩy Footer xuống sát lề dưới cùng 
          của flex container. */}
      <footer className="mt-auto p-4 text-center text-xs text-slate-400 border-t bg-white">
        &copy; {new Date().getFullYear()} Step Company - IT Infrastructure Management System
      </footer>

    </div>
  );
}