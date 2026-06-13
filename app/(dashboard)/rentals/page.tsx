"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Plus, RefreshCw, Search, AlertTriangle, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Types
import { RentalContract } from "@/types/rental";

export default function RentalsPage() {
  const router = useRouter();

  const [rentals, setRentals] = useState<RentalContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [returnConfirmId, setReturnConfirmId] = useState<string | null>(null);
  const [printContract, setPrintContract] = useState<any | null>(null);

  // 1. State cho thanh tìm kiếm & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL_NOT_RETURNED");

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
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600" onClick={() => setPrintContract(contract)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        {contract.status === "ACTIVE" && (
                          <Button variant="destructive" size="sm" onClick={() => setReturnConfirmId(contract.id)} disabled={!!processingId}>
                            {processingId === contract.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Thu hồi"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PRINT DIALOG */}
      {printContract && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPrintContract(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-lg">Phiếu Cho Thuê Thiết Bị</h2>
              <div className="flex gap-2">
                <Button onClick={() => window.print()} className="bg-blue-600 text-white">
                  <Printer className="w-4 h-4 mr-2" /> In / Xuất PDF
                </Button>
                <Button variant="outline" onClick={() => setPrintContract(null)}>Đóng</Button>
              </div>
            </div>
            <div id="print-area" className="p-8 space-y-6">
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold uppercase tracking-wide">STEP IT - Phiếu Cho Thuê</h1>
                <p className="text-slate-500 text-sm mt-1">Mã hợp đồng: {printContract.id.slice(-8).toUpperCase()}</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-700 border-b pb-1">Thông tin khách hàng</h3>
                  <p><span className="text-slate-500 text-sm">Tên KH:</span><br /><strong>{printContract.customerName}</strong></p>
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-700 border-b pb-1">Thông tin hợp đồng</h3>
                  <p><span className="text-slate-500 text-sm">Ngày bắt đầu:</span><br /><strong>{format(new Date(printContract.startDate), "dd/MM/yyyy")}</strong></p>
                  <p><span className="text-slate-500 text-sm">Ngày kết thúc:</span><br /><strong>{format(new Date(printContract.endDate), "dd/MM/yyyy")}</strong></p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-bold text-slate-700 border-b pb-1">Thiết bị cho thuê</h3>
                <table className="w-full text-sm border">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 border-b font-medium">Tên thiết bị</th>
                      <th className="text-left p-2 border-b font-medium">Serial Number</th>
                      <th className="text-left p-2 border-b font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border-b">{printContract.asset.product.name}</td>
                      <td className="p-2 border-b font-mono">{printContract.asset.serialNumber}</td>
                      <td className="p-2 border-b">{printContract.status}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-8 pt-8 mt-8 border-t">
                <div className="text-center space-y-12">
                  <p className="font-medium text-slate-700">Đại diện bên cho thuê</p>
                  <div className="border-b border-dashed border-slate-400 w-full"></div>
                  <p className="text-sm text-slate-500">Ký & ghi rõ họ tên</p>
                </div>
                <div className="text-center space-y-12">
                  <p className="font-medium text-slate-700">Đại diện bên thuê</p>
                  <div className="border-b border-dashed border-slate-400 w-full"></div>
                  <p className="text-sm text-slate-500">Ký & ghi rõ họ tên</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!returnConfirmId} onOpenChange={open => !open && setReturnConfirmId(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận Thu hồi thiết bị?</AlertDialogTitle>
            <AlertDialogDescription>
              Khách hàng đã trả thiết bị này? Hành động này sẽ kết thúc hợp đồng và chuyển thiết bị về trạng thái <strong>Trong kho</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { if (returnConfirmId) handleReturn(returnConfirmId); setReturnConfirmId(null); }}
            >
              Xác nhận Thu hồi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}