import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import UserPageClient from "./components/UserPageClient";
import { User } from "lucide-react";

export const metadata = {
  title: "Quản lý Người Dùng | Step IT Warehouse",
};

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as { role?: string } | undefined)?.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1.5">
      <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3 text-slate-900 tracking-tight">
        <div className="p-2 bg-slate-100 text-slate-700 rounded-lg md:rounded-xl border border-slate-200 shadow-sm">
          <User className="w-6 h-6" />
        </div>
        Quản lý Người Dùng
      </h1>
      <p className="text-slate-500 font-medium ml-1 mt-1">
        Quản lý tài khoản người dùng, phân quyền và thông tin cá nhân.
      </p>
      </div>
      <UserPageClient />
    </div>
  );
}
