"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Package,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  Toolbox,
  CalendarClock,
  PackageCheck
} from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, format } from "date-fns";
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);

        // Hiển thị toast cho hợp đồng sắp hết hạn
        if (json.expiringRentals && json.expiringRentals.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          json.expiringRentals.forEach((contract: any, index: number) => {
            // Giới hạn chỉ hiển thị 3 thông báo đầu tiên để tránh spam
            if (index < 3) {
              const endDate = new Date(contract.endDate);
              endDate.setHours(0, 0, 0, 0);
              const days = differenceInDays(endDate, today);

              setTimeout(() => {
                if (days < 0) {
                  toast.error(`⚠️ Hợp đồng ${contract.asset.serialNumber} đã HẾT HẠN!`);
                } else if (days === 0) {
                  toast.error(`🚨 Hợp đồng ${contract.asset.serialNumber} hết hạn HÔM NAY!`);
                } else {
                  toast.warning(`⏳ Hợp đồng ${contract.asset.serialNumber} sẽ hết hạn sau ${days} ngày.`);
                }
              }, index * 500); // Thêm delay nhỏ giữa các toast
            }
          });
        }
      });
  }, []);

  if (loading) return <div className="p-10 text-center font-mono">Loading System Dashboard...</div>;

  const { summary, alerts, statsByCategory, expiringRentals } = data;

  // Lấy màu sắc cảnh báo thuê thiết bị
  const getRentalAlertColor = (days: number) => {
    if (days < 0) return "bg-red-900 border-red-800 text-white"; // Hết hạn -> Đỏ đậm
    if (days <= 1) return "bg-red-500 border-red-500 text-white"; // 1 ngày -> Đỏ
    if (days <= 3) return "bg-orange-500 border-orange-500 text-white"; // 3 ngày -> Cam
    if (days <= 7) return "bg-yellow-400 border-yellow-400 text-slate-900"; // 7 ngày -> Vàng
    return "bg-green-500 border-green-500 text-white"; // 14 ngày -> Xanh
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Hệ thống Kho IT - Step Co.</h1>
        <p className="text-slate-500 italic text-sm">Cập nhật thời gian thực từ hạ tầng kho thiết bị.</p>
      </div>

      {/* 1. KPI CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        <Link href="/assets" className="block">
          <StatCard
            title="Tổng thiết bị"
            value={summary.total}
            icon={<Package className="text-blue-600" />}
          />
        </Link>

        <Link href="/assets?status=IN_STOCK" className="block">
          <StatCard
            title="Trong kho"
            value={summary.inStock}
            icon={<CheckCircle className="text-green-600" />}
          />
        </Link>

        <Link href="/assets?status=DEPLOYED" className="block">
          <StatCard
            title="Đang vận hành"
            value={summary.deployed}
            icon={<Activity className="text-purple-600" />}
          />
        </Link>
        <Link href="/rentals?status=ACTIVE" className="block">
          <div className="cursor-pointer hover:scale-[1.02] transition">
            <StatCard
              title="Đang Thuê"
              value={summary.rented}
              icon={<PackageCheck className="text-blue-600" />}
              color="text-blue-600"
            />
          </div>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 2. CẢNH BÁO THIẾT BỊ LỖI (ALERTS) */}
        <Card className="border-red-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" /> Cần xử lý gấp
            </CardTitle>
            <Badge variant="destructive">{alerts.length} sự cố</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Không có sự cố nào ghi nhận.</p>
              ) : (
                alerts.map((asset: any) => (
                  <div key={asset.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{asset.product.name}</p>
                      <p className="text-xs text-slate-500 font-mono">SN: {asset.serialNumber}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={asset.status === 'FAULTY' ? 'bg-red-600' : 'bg-orange-500'}>
                        {asset.status}
                      </Badge>
                      <p className="text-[10px] text-slate-400 mt-1">{asset.warehouse.name}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>



        {/* 3. PHÂN BỔ DANH MỤC (CATEGORY DISTRIBUTION) */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Toolbox className="w-5 h-5 text-slate-500" /> Phân bổ vật tư
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(statsByCategory).map(([category, count]: any) => {
              const percentage = ((count / summary.total) * 100).toFixed(1);
              return (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{category}</span>
                    <span className="text-slate-500">{count} món</span>
                  </div>
                  {/* Progress Bar bằng Tailwind */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>


      </div>

      {/* 4. RENTAL MONITORING WIDGET */}
      <Card className="shadow-sm border-blue-100 mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-blue-800">
            <CalendarClock className="w-5 h-5" /> Rental Monitoring (Sắp hết hạn)
          </CardTitle>
          <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
            {expiringRentals?.length || 0} hợp đồng
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Customer</th>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3 font-mono">Serial</th>
                  <th className="px-4 py-3">EndDate</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Days Remaining</th>
                </tr>
              </thead>
              <tbody>
                {expiringRentals?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">
                      Không có hợp đồng nào sắp hết hạn trong 14 ngày tới.
                    </td>
                  </tr>
                ) : (
                  expiringRentals?.map((contract: any) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const endDate = new Date(contract.endDate);
                    endDate.setHours(0, 0, 0, 0);

                    const daysRemaining = differenceInDays(endDate, today);

                    return (
                      <tr key={contract.id} className="border-b last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">{contract.customerName}</td>
                        <td className="px-4 py-3 text-slate-600">{contract.asset.product.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{contract.asset.serialNumber}</td>
                        <td className="px-4 py-3 text-slate-600">{format(new Date(contract.endDate), 'dd/MM/yyyy')}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge className={`font-bold ${getRentalAlertColor(daysRemaining)}`}>
                            {daysRemaining < 0 ? 'Đã quá hạn' : `${daysRemaining} ngày`}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-component cho Stat Card
function StatCard({ title, value, icon, color = "text-slate-900" }: any) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}