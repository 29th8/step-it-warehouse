"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ClipboardList,
  Grid3x3,
  History,
  LayoutDashboard,
  MapPin,
  Menu,
  Monitor,
  Package,
  Server,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const primaryItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Thiết bị", href: "/assets", icon: Server },
  { label: "Sản phẩm", href: "/products", icon: Package },
  { label: "Rack", href: "/racks", icon: Grid3x3 },
];

const secondaryItems = [
  { label: "Vị trí", href: "/warehouses", icon: MapPin },
  { label: "Bàn giao", href: "/handovers", icon: ClipboardList },
  { label: "Lịch sử", href: "/history", icon: History },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const menuItems = isAdmin
    ? [...secondaryItems, { label: "Tài khoản", href: "/users", icon: Users }]
    : secondaryItems;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-10px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <nav className="grid grid-cols-5 items-center gap-1">
          {primaryItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold transition-colors",
                isActive(item.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900">
                <Menu className="h-5 w-5" />
                <span>Thêm</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[75vh] rounded-t-2xl bg-white p-0">
              <SheetHeader className="border-b border-slate-100 bg-slate-50">
                <SheetTitle className="flex items-center gap-2 text-slate-900">
                  <Monitor className="h-5 w-5 text-blue-600" />
                  Điều hướng
                </SheetTitle>
              </SheetHeader>
              <div className="grid gap-2 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
                {menuItems.map((item) => (
                  <Button
                    key={item.href}
                    asChild
                    variant="ghost"
                    className={cn(
                      "h-12 justify-start rounded-lg px-3 text-sm font-semibold",
                      isActive(item.href) ? "bg-blue-50 text-blue-700" : "text-slate-700"
                    )}
                  >
                    <Link href={item.href} onClick={() => setMenuOpen(false)}>
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </>
  );
}
