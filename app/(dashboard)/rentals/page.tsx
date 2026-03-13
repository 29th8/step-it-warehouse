"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Plus, RefreshCw, Search, AlertTriangle } from "lucide-react"; // Đã thêm icon Search
import { toast } from "sonner";
import { FileText } from "lucide-react";
// Shadcn Components
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Types
import { RentalContract } from "@/types/rental";

export default function RentalsPage() {
  const router = useRouter();

  const [rentals, setRentals] = useState<RentalContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 1. State cho thanh tìm kiếm & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL_NOT_RETURNED"); // Mặc định không hiện RETURNED

  // Fetch Data
  const fetchRentals = async () => {
    setLoading(true);
    try {
      let url = "/api/rentals";

      // Xử lý query params
      if (statusFilter === "ALL") {
        url += "?status=ALL";
      } else if (statusFilter === "ACTIVE") {
        url += "?status=ACTIVE";
      } else if (statusFilter === "RETURNED") {
        url += "?status=RETURNED";
      } else if (statusFilter === "EXPIRED") {
        url += "?status=EXPIRED";
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      const list = Array.isArray(data) ? data : data.data || [];
      setRentals(list);
    } catch (error) {
      toast.error("Không thể tải danh sách hợp đồng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, [statusFilter]);

  // 2. Logic Lọc dữ liệu (Search Filter)
  const filteredRentals = rentals.filter((contract) => {
    if (!searchQuery) return true; // Nếu không tìm gì thì hiện hết

    const query = searchQuery.toLowerCase();

    // Tìm kiếm trong: Tên khách hàng, Serial Number, Tên sản phẩm
    return (
      contract.customerName.toLowerCase().includes(query) ||
      contract.asset.serialNumber.toLowerCase().includes(query) ||
      contract.asset.product.name.toLowerCase().includes(query)
    );
  });

  // Handle Return Action
  const handleReturn = async (contractId: string) => {
    if (!window.confirm("Xác nhận: Khách hàng đã trả thiết bị này?")) return;

    setProcessingId(contractId);
    try {
      const res = await fetch("/api/rentals/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId }),
      });

      if (!res.ok) throw new Error("Failed to return");

      toast.success("Đã cập nhật trạng thái trả thiết bị thành công.");

      router.refresh();
      fetchRentals();
    } catch (error) {
      toast.error("Có lỗi xảy ra khi cập nhật trạng thái.");
    } finally {
      setProcessingId(null);
    }
  };

  // Logic hiển thị Badge
  const renderStatus = (contract: RentalContract) => {
    const now = new Date();
    const endDate = new Date(contract.endDate);

    if (contract.status === "ACTIVE" && endDate < now) {
      return <Badge variant="destructive">Hết hạn</Badge>;
    }

    switch (contract.status) {
      case "ACTIVE":
        return <Badge className="bg-green-600 hover:bg-green-700">Hoạt động</Badge>;
      case "RETURNED":
        return <Badge variant="secondary">Đã trả</Badge>;
      case "CANCELLED":
        return <Badge variant="outline">Đã hủy</Badge>;
      default:
        return <Badge variant="outline">{contract.status}</Badge>;
    }
  };

  const renderDaysRemaining = (contract: RentalContract) => {
    const days = contract.daysRemaining;
    if (days === undefined) return null;

    if (days < 0) {
      return <Badge className="bg-red-900 text-white font-bold border-red-800">Expired</Badge>;
    }
    if (days <= 3) {
      return (
        <Badge className="bg-red-500 text-white font-bold border-red-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {days} ngày
        </Badge>
      );
    }
    if (days <= 7) {
      return <Badge className="bg-yellow-400 text-slate-900 font-bold border-yellow-400 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> {days} ngày
      </Badge>;
    }
    return <Badge className="bg-green-500 text-white font-bold border-green-500">{days} ngày</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">

      {/* Header & Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900 tracking-tight">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl border border-slate-200 shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            Quản lý Thuê
          </h1>
          <p className="text-slate-500 font-medium ml-1 mt-1">
            Theo dõi hợp đồng và trạng thái thiết bị cho thuê.
          </p>
        </div>

        {/* Khu vực công cụ bên phải */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">

          <div className="flex gap-2">
            {/* 3. Thanh tìm kiếm UI */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm khách, SN, tên máy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            {/* Filter Dropdown */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue placeholder="Bộ lọc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_NOT_RETURNED">Mặc định</SelectItem>
                <SelectItem value="ALL">Tất cả (All)</SelectItem>
                <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                <SelectItem value="RETURNED">Đã trả</SelectItem>
                <SelectItem value="EXPIRED">Hết hạn</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={fetchRentals} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => router.push("/rentals/create")}>
              <Plus className="mr-2 h-4 w-4" /> Tạo Hợp Đồng
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle>Danh sách Hợp đồng</CardTitle>
            <span className="text-sm text-muted-foreground">
              Hiển thị {filteredRentals.length} kết quả
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Serial Number</TableHead>
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Ngày thuê</TableHead>
                <TableHead>Ngày trả (Dự kiến)</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Số ngày thuê còn lại</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredRentals.length === 0 ? (
                // Hiển thị thông báo khác nhau tùy vào việc có đang tìm kiếm hay không
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {searchQuery ? "Không tìm thấy kết quả phù hợp." : "Chưa có hợp đồng nào trong hệ thống."}
                  </TableCell>
                </TableRow>
              ) : (
                // 4. Render danh sách đã lọc (filteredRentals)
                filteredRentals.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-mono font-medium">
                      {contract.asset.serialNumber}
                    </TableCell>
                    <TableCell>{contract.asset.product.name}</TableCell>
                    <TableCell className="font-medium">{contract.customerName}</TableCell>
                    <TableCell>
                      {format(new Date(contract.startDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(contract.endDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{renderStatus(contract)}</TableCell>
                    <TableCell>{renderDaysRemaining(contract)}</TableCell>
                    <TableCell className="text-right">
                      {contract.status === "ACTIVE" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReturn(contract.id)}
                          disabled={!!processingId}
                        >
                          {processingId === contract.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Thu hồi"
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}