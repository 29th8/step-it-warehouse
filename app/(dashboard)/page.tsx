"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Package, AlertTriangle, CheckCircle, Toolbox, CalendarClock, PackageCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

type DashboardSummary = {
  inStock: number;
  installed: number;
  installedInWarehouse: number;
  deployed: number;
  reserved: number;
  handedOver: number;
  maintenance: number;
  faulty: number;
  disposed: number;
  rented: number;
  total: number;
};

type ChartItem = {
  name: string;
  value: number;
  color?: string;
};

type TrendItem = {
  date: string;
  count: number;
};

type DashboardAsset = {
  id: string;
  serialNumber: string;
  status: string;
  product?: { name?: string };
};

type DashboardRental = {
  id: string;
  customerName: string;
  endDate: string;
  asset?: { serialNumber?: string };
};

type DashboardData = {
  summary: DashboardSummary;
  alerts: DashboardAsset[];
  categoryChartData: ChartItem[];
  statusChartData: ChartItem[];
  trend7Days: TrendItem[];
  expiringRentals: DashboardRental[];
};

const emptyDashboardData: DashboardData = {
  summary: {
    inStock: 0,
    installed: 0,
    installedInWarehouse: 0,
    deployed: 0,
    reserved: 0,
    handedOver: 0,
    maintenance: 0,
    faulty: 0,
    disposed: 0,
    rented: 0,
    total: 0,
  },
  alerts: [],
  categoryChartData: [],
  statusChartData: [],
  trend7Days: [],
  expiringRentals: [],
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Không thể tải dữ liệu dashboard");
      }

      const nextData: DashboardData = {
        summary: { ...emptyDashboardData.summary, ...(json?.summary || {}) },
        alerts: Array.isArray(json?.alerts) ? json.alerts : [],
        categoryChartData: Array.isArray(json?.categoryChartData) ? json.categoryChartData : [],
        statusChartData: Array.isArray(json?.statusChartData) ? json.statusChartData : [],
        trend7Days: Array.isArray(json?.trend7Days) ? json.trend7Days : [],
        expiringRentals: Array.isArray(json?.expiringRentals) ? json.expiringRentals : [],
      };

      setData(nextData);

      if (nextData.expiringRentals.length > 0) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          nextData.expiringRentals.slice(0, 3).forEach((c, i) => {
            const days = differenceInDays(new Date(c.endDate), today);
            const serialNumber = c.asset?.serialNumber || "N/A";
            setTimeout(() => {
              if (days < 0) toast.error(`Hợp đồng ${serialNumber} đã HẾT HẠN!`);
              else if (days === 0) toast.error(`Hợp đồng ${serialNumber} hết hạn HÔM NAY!`);
              else toast.warning(`Hợp đồng ${serialNumber} hết hạn sau ${days} ngày.`);
            }, i * 400);
          });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải dữ liệu dashboard";
      setError(message);
      toast.error(message);
      setData(emptyDashboardData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return (
    <div className="p-3 sm:p-4 md:p-10 text-center">
      <div className="animate-pulse space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}</div>
        <div className="grid gap-4 lg:grid-cols-2">{[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-slate-200 rounded-xl" />)}</div>
      </div>
    </div>
  );

  const { summary, alerts, categoryChartData, statusChartData, trend7Days, expiringRentals } = data;

  const PIE_COLORS = ["#22c55e", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#f97316"];

  const getRentalAlertColor = (days: number) => {
    if (days < 0) return "bg-red-900 border-red-800 text-white";
    if (days <= 1) return "bg-red-500 text-white";
    if (days <= 3) return "bg-orange-500 text-white";
    if (days <= 7) return "bg-yellow-400 text-slate-900";
    return "bg-green-500 text-white";
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Hệ thống Kho IT - Step Co.</h1>
        <p className="text-slate-500 text-sm mt-1">Cập nhật thời gian thực từ hạ tầng kho thiết bị.</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-red-700">Không tải được dữ liệu dashboard</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button
              onClick={fetchDashboard}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Thử lại
            </button>
          </CardContent>
        </Card>
      )}

      {/* KPI CARDS */}
      <div className="grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-5">
        {[
          { title: "Tổng thiết bị", value: summary.total, icon: <Package className="text-blue-600 w-5 h-5" />, href: "/assets", color: "text-slate-900" },
          { title: "Trong kho", value: summary.inStock, icon: <CheckCircle className="text-green-600 w-5 h-5" />, href: "/assets", color: "text-green-600" },
          { title: "Đang vận hành", value: summary.deployed, icon: <Activity className="text-blue-600 w-5 h-5" />, href: "/assets", color: "text-blue-600" },
          { title: "Đang thuê", value: summary.rented, icon: <PackageCheck className="text-purple-600 w-5 h-5" />, href: "/rentals", color: "text-purple-600" },
          { title: "Cần xử lý", value: summary.faulty + summary.maintenance, icon: <AlertTriangle className="text-red-500 w-5 h-5" />, href: "/assets", color: "text-red-600" },
        ].map(card => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-500">{card.title}</CardTitle>
                {card.icon}
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className={`text-2xl md:text-3xl font-bold ${card.color}`}>{card.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* CHARTS ROW */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Bar chart: Nhập kho 7 ngày */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" /> Thiết bị nhập kho 7 ngày gần nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend7Days} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: unknown) => [`${v} thiết bị`, "Nhập kho"]} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart: Trạng thái */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Toolbox className="w-4 h-4 text-slate-500" /> Phân bổ trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {statusChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [`${v} thiết bị`, name]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Bar chart: Danh mục */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Phân bổ danh mục</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryChartData} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                <Tooltip formatter={(v: unknown) => [`${v} thiết bị`]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cảnh báo thiết bị lỗi */}
        <Card className="border-red-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" /> Cần xử lý gấp
            </CardTitle>
            <Badge variant="destructive">{alerts.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Không có sự cố nào.</p>
              ) : alerts.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg border border-red-100">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{asset.product?.name || "N/A"}</p>
                    <p className="text-xs font-mono text-slate-500">{asset.serialNumber}</p>
                  </div>
                  <Badge className={asset.status === 'FAULTY' ? 'bg-red-600 text-xs' : 'bg-orange-500 text-xs'}>
                    {asset.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rental monitoring */}
        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-800">
              <CalendarClock className="w-4 h-4" /> Hợp đồng sắp hết hạn
            </CardTitle>
            <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">{expiringRentals?.length || 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {!expiringRentals?.length ? (
                <p className="text-sm text-slate-500 italic">Không có hợp đồng sắp hết hạn.</p>
              ) : expiringRentals.map((c) => {
                const days = differenceInDays(new Date(c.endDate), new Date());
                return (
                  <div key={c.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border">
                    <div>
                      <p className="text-sm font-bold truncate max-w-[140px]">{c.customerName}</p>
                      <p className="text-xs font-mono text-slate-500">{c.asset?.serialNumber || "N/A"}</p>
                    </div>
                    <Badge className={`text-xs font-bold ${getRentalAlertColor(days)}`}>
                      {days < 0 ? 'Hết hạn' : `${days} ngày`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
