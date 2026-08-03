"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSidebar } from "@/context/sidebar-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, Server,
  ChevronLeft, ChevronRight, Monitor, History,
  MapPin, Users, ClipboardList,
} from "lucide-react";

export function Sidebar() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const { isCollapsed, toggleSidebar } = useSidebar();
  const pathname = usePathname();

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-50 hidden h-screen flex-col border-r bg-white transition-all duration-300 md:flex",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Nút Toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-10 bg-white border rounded-full p-1 hover:bg-slate-50 shadow-sm"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="p-6 flex items-center gap-3 border-b h-16 shrink-0 overflow-hidden">
        <div className="bg-blue-600 p-2 rounded-lg text-white shrink-0">
          <Monitor size={20} />
        </div>
        {!isCollapsed && <span className="font-bold text-xl tracking-tight text-slate-800 transition-opacity duration-300">Step-IT</span>}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {[
          { label: "Dashboard", href: "/", icon: LayoutDashboard },
          { label: "Sản phẩm", href: "/products", icon: Package },
          { label: "Thiết bị", href: "/assets", icon: Server },
          { label: "Vị trí", href: "/warehouses", icon: MapPin },
          // { label: "Hợp đồng", href: "/rentals", icon: FileText }, // Ẩn - không dùng tính năng cho thuê
          { label: "Bàn giao", href: "/handovers", icon: ClipboardList },
          { label: "Tủ Rack", href: "/racks", icon: Server },
          { label: "Lịch sử hệ thống", href: "/history", icon: History },
          ...(isAdmin ? [{ label: "Tài khoản", href: "/users", icon: Users }] : []),
        ].map((item) => (
          <Link key={item.href} href={item.href} className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all",
            pathname === item.href ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
          )}>
            <item.icon size={20} className="shrink-0" />
            <span className={cn("transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100")}>
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
