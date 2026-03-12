"use client";

import React, { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, User, Settings } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  // STATE THÔNG BÁO (Chuông)
  const [notifications, setNotifications] = useState<any[]>([]);

  // LẤY THÔNG BÁO THIẾT BỊ LỖI
  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((d) => {
        if (d.alerts) setNotifications(d.alerts);
      })
      .catch(() => console.error("Lỗi lấy thông báo"));
  }, []);

  const { data: session } = useSession();

  const user = session?.user as any;

  const displayName = user?.name || user?.username || "User";
  const email = user?.email || "";
  const role = user?.role || "User";

  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    // Thay đổi justify-between thành justify-end để dồn tất cả sang phải 
    // (Vì không còn Search Bar bên trái nữa)
    <header className="h-16 border-b bg-white sticky top-0 z-40 px-6 flex items-center justify-end shadow-sm">

      {/* ================= THÔNG BÁO & USER AVATAR ================= */}
      <div className="flex items-center gap-2 sm:gap-4">

        {/* 2. MENU TÀI KHOẢN (USER DROPDOWN) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 p-1 pr-2 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all focus:outline-none">

              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-tight">{displayName}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{role}</p>
              </div>

              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white">
                A
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56 bg-white z-50 mt-2 rounded-xl shadow-lg border-slate-200 p-1" align="end" forceMount>

            <DropdownMenuLabel className="font-normal px-2 py-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold leading-none text-slate-800">Tài khoản của tôi</p>
                <p className="text-xs leading-none text-slate-500 mt-1">admin@step.company</p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-slate-100" />

            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer py-2 px-3 text-slate-600 hover:text-slate-900 focus:bg-slate-50 transition-colors">
                <User className="mr-2 h-4 w-4 text-slate-400" />
                <span>Hồ sơ cá nhân</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-2 px-3 text-slate-600 hover:text-slate-900 focus:bg-slate-50 transition-colors">
                <Settings className="mr-2 h-4 w-4 text-slate-400" />
                <span>Cài đặt hệ thống</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-slate-100" />

            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="cursor-pointer py-2 px-3 text-red-600 focus:text-red-700 focus:bg-red-50 font-medium transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Đăng xuất</span>
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}