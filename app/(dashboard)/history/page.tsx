"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { History, Search, Filter, RefreshCw, Box, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Spinner } from "@/components/common/spinner";

type HistoryUser = {
  id?: string;
  name?: string | null;
  username?: string | null;
  role?: string | null;
};

type HistoryMovement = {
  id: string;
  type: string;
  note?: string | null;
  createdAt: string | Date;
  assetId?: string | null;
  asset?: {
    serialNumber?: string | null;
    product?: { name?: string | null } | null;
  } | null;
  user?: HistoryUser | null;
  targetUser?: HistoryUser | null;
};

type HistoryResponse = {
  data?: HistoryMovement[];
  totalPages?: number;
};

type UsersResponse = {
  data?: HistoryUser[];
  users?: HistoryUser[];
};

export default function HistoryPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const ACTION_LABELS: Record<string, string> = {
    IMPORT: "Nhập kho",
    EXPORT: "Xuất kho",
    TRANSFER: "Luân chuyển",
    ASSEMBLE: "Lắp ráp",
    DISASSEMBLE: "Tháo rời",
    CREATE_USER: "Tạo người dùng",
    UPDATE_USER: "Cập nhật người dùng",
    DISABLE_USER: "Khóa tài khoản",
    ENABLE_USER: "Kích hoạt tài khoản",
    DELETE_USER: "Xóa người dùng",
    RESET_PASSWORD: "Đặt lại mật khẩu",
    CREATE_PRODUCT: "Tạo sản phẩm",
    UPDATE_PRODUCT: "Cập nhật sản phẩm",
    DELETE_PRODUCT: "Xóa sản phẩm",
    CREATE_WAREHOUSE: "Tạo kho",
    UPDATE_WAREHOUSE: "Cập nhật kho",
    DELETE_WAREHOUSE: "Xóa kho",
    CREATE_RACK: "Tạo tủ rack",
    UPDATE_RACK: "Cập nhật rack",
    DELETE_RACK: "Xóa rack",
    CREATE_RENTAL: "Tạo hợp đồng thuê",
    UPDATE_RENTAL: "Cập nhật hợp đồng thuê",
    RETURN_RENTAL: "Trả hợp đồng thuê",
    DELETE_RENTAL: "Xóa hợp đồng thuê",
    DELETE: "Xóa thiết bị",
    RESTORE: "Khôi phục thiết bị",
    HARD_DELETE: "Xóa thiết bị vĩnh viễn"
  };

  const [movements, setMovements] = useState<HistoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // States cho Bộ lọc
  const [searchQuery, setSearchQuery] = useState("");
  const [entityType, setEntityType] = useState("ALL");
  const [timeRange, setTimeRange] = useState("ALL");
  const [executorId, setExecutorId] = useState("ALL");
  const [usersList, setUsersList] = useState<HistoryUser[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        entityType,
        timeRange,
        userId: executorId,
        search: searchQuery
      });

      const res = await fetch(`/api/system-history?${query.toString()}`);
      const json: HistoryResponse = await res.json();
      if (res.ok && json.data) {
        setMovements(json.data);
        setTotalPages(json.totalPages || 1);
      } else {
        setMovements([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Lỗi fetch movements:", error);
      setMovements([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [entityType, executorId, page, searchQuery, timeRange]);

  const handleRestore = async (assetId: string) => {
    if (!assetId) return;
    setProcessingId(assetId);
    try {
      const res = await fetch(`/api/assets/${assetId}/restore`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khôi phục");
      toast.success("Khôi phục thành công");
      fetchMovements();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi khôi phục";
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermanentDelete = async (assetId: string) => {
    if (!assetId) return;
    setProcessingId(assetId);
    try {
      const res = await fetch(`/api/assets/${assetId}/permanent`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi xóa vĩnh viễn");
      toast.success("Xóa vĩnh viễn thành công");
      fetchMovements();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi xóa vĩnh viễn";
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  useEffect(() => {
    // Load list user cho dropdown Lọc người thực hiện
    fetch("/api/users?page=1&limit=100")
      .then(res => res.json())
      .then((data: UsersResponse) => {
        if (data && data.data) {
          setUsersList(data.data);
        } else if (data && data.users) {
          setUsersList(data.users);
        }
      });
  }, []);

  // Delay trigger auto search khi nhập ô Text Box
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchMovements();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchMovements, searchQuery]);

  // Helper: Trả về màu Badge tương ứng với từng loại thao tác
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "IMPORT": return "bg-green-100 text-green-700 border-green-200";
      case "TRANSFER": return "bg-blue-100 text-blue-700 border-blue-200";
      case "DELETE": return "bg-red-100 text-red-800 border-red-200";
      case "HARD_DELETE": return "bg-red-100 text-red-800 border-red-800";
      case "DELETE_USER": return "bg-red-100 text-red-800 border-red-200";
      case "DELETE_PRODUCT": return "bg-red-100 text-red-800 border-red-200";
      case "DELETE_WAREHOUSE": return "bg-red-100 text-red-800 border-red-200";
      case "DELETE_RACK": return "bg-red-100 text-red-800 border-red-200";
      case "DELETE_RENTAL": return "bg-red-100 text-red-800 border-red-200";

      case "CREATE_USER": return "bg-purple-100 text-purple-800 border-purple-200";
      case "CREATE_PRODUCT": return "bg-purple-100 text-purple-800 border-purple-200";
      case "CREATE_WAREHOUSE": return "bg-purple-100 text-purple-800 border-purple-200";
      case "CREATE_RACK": return "bg-purple-100 text-purple-800 border-purple-200";
      case "CREATE_RENTAL": return "bg-purple-100 text-purple-800 border-purple-200";
      case "ASSEMBLE": return "bg-purple-100 text-purple-700 border-purple-200";

      case "UPDATE_USER": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "UPDATE_PRODUCT": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "UPDATE_WAREHOUSE": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "UPDATE_RACK": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "UPDATE_RENTAL": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "DISABLE_USER": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "RESET_PASSWORD": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "DISASSEMBLE": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "EXPORT": return "bg-yellow-100 text-yellow-700 border-yellow-200"; // Also updating/moving

      case "ENABLE_USER": return "bg-green-100 text-green-800 border-green-200";
      case "RESTORE": return "bg-green-100 text-green-800 border-green-200";
      case "RETURN_RENTAL": return "bg-green-100 text-green-800 border-green-200";

      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-8 space-y-4 md:space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">

      {/* ================= HEADER & TOOLBAR (2 TẦNG) ================= */}
      <div className="flex flex-col gap-6 mb-6">

        {/* TẦNG 1: TIÊU ĐỀ */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3 text-slate-900 tracking-tight">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg md:rounded-xl border border-slate-200 shadow-sm">
              <History className="w-6 h-6" />
            </div>
            Lịch sử Hệ thống
          </h1>
          <p className="text-slate-500 font-medium ml-1 mt-1">
            Ghi nhận biến động trên máy chủ, tác động lên giao dịch thiết bị, kho.
          </p>
        </div>

        {/* TẦNG 2: THANH CÔNG CỤ */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          {/* TÌM KIẾM */}
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-700 transition-colors" />
            <Input
              placeholder="Tìm theo Serial Number hoặc nội dung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 w-full bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-1 focus-visible:ring-slate-400 transition-all hover:border-slate-300"
            />
          </div>

          {/* LỌC & LÀM MỚI */}
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:w-auto lg:items-center">

            {/* Filter: Dòng thời gian */}
            <Select value={timeRange} onValueChange={(val) => { setTimeRange(val); setPage(1); }}>
              <SelectTrigger className="h-11 w-full lg:w-[150px] bg-white border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors font-medium">
                <SelectValue placeholder="Thời gian..." />
              </SelectTrigger>
              <SelectContent className="bg-white rounded-xl shadow-lg border-slate-200">
                <SelectItem value="ALL">Mọi lúc</SelectItem>
                <SelectItem value="TODAY">Hôm nay</SelectItem>
                <SelectItem value="7DAYS">7 ngày qua</SelectItem>
                <SelectItem value="30DAYS">30 ngày qua</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter: Đối tượng Entity */}
            <Select value={entityType} onValueChange={(val) => { setEntityType(val); setPage(1); }}>
              <SelectTrigger className="h-11 w-full lg:w-[170px] bg-white border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors font-medium">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Đối tượng..." />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white rounded-xl shadow-lg border-slate-200">
                <SelectItem value="ALL">Tất cả đối tượng</SelectItem>
                <SelectItem value="ASSET">Thiết bị / Linh kiện</SelectItem>
                <SelectItem value="USER">Người dùng</SelectItem>
                <SelectItem value="PRODUCT">Mã SP (Product)</SelectItem>
                <SelectItem value="WAREHOUSE">Kho hàng</SelectItem>
                <SelectItem value="RACK">Tủ Rack</SelectItem>
                <SelectItem value="RENTAL">Hợp đồng thuê</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter: Người thực hiện */}
            <Select value={executorId} onValueChange={(val) => { setExecutorId(val); setPage(1); }}>
              <SelectTrigger className="h-11 w-full lg:w-[180px] bg-white border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors font-medium">
                <SelectValue placeholder="Người thực hiện..." />
              </SelectTrigger>
              <SelectContent className="bg-white rounded-xl shadow-lg border-slate-200 max-h-[250px]">
                <SelectItem value="ALL">Tất cả nhân sự</SelectItem>
                {usersList.filter((u) => u.id).map(u => (
                  <SelectItem key={u.id} value={u.id || ""}>{u.name || u.username || u.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchMovements}
              disabled={loading}
              title="Làm mới dữ liệu"
              className="h-11 w-11 shrink-0 bg-white border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </Button>

          </div>
        </div>
      </div>

      {/* ================= BẢNG DỮ LIỆU (TABLE) ================= */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="md:hidden">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">Đang tải lịch sử hoạt động...</div>
          ) : movements.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm italic text-slate-400">
              Không tìm thấy lịch sử nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {movements.map((move) => (
                <article key={move.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-slate-500">
                        {new Date(move.createdAt).toLocaleString("vi-VN", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                      <div className="mt-2">
                        <Badge variant="outline" className={`${getTypeBadge(move.type)} whitespace-nowrap`}>
                          {ACTION_LABELS[move.type] || move.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      {move.user ? (
                        <>
                          <p className="font-semibold text-slate-800">{move.user.name}</p>
                          <p className="font-mono text-slate-400">@{move.user.username}</p>
                        </>
                      ) : (
                        <span className="italic text-slate-400">Không xác định</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    {move.asset ? (
                      <div className="mb-2">
                        <p className="font-mono text-xs font-bold text-blue-600">{move.asset.serialNumber}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                          <Box className="h-3 w-3" /> {move.asset.product?.name || "N/A"}
                        </p>
                      </div>
                    ) : move.targetUser ? (
                      <div className="mb-2">
                        <p className="text-xs font-bold text-slate-800">{move.targetUser.username}</p>
                        <p className="text-xs text-slate-500">Vai trò: {move.targetUser.role}</p>
                      </div>
                    ) : null}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{move.note}</p>
                  </div>

                  {move.type === "DELETE" && move.asset && move.assetId && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(move.assetId!)}
                        disabled={!!processingId}
                        className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                      >
                        {processingId === move.assetId ? <Spinner size="h-3 w-3 mr-1" color="text-green-600" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                        Khôi phục
                      </Button>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={!!processingId} className="flex-1">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Xóa hẳn
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-md bg-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                Xóa vĩnh viễn thiết bị
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-base text-slate-600 mt-2">
                                Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-6">
                              <AlertDialogCancel className="border-slate-200">Hủy</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handlePermanentDelete(move.assetId!)} className="bg-red-600 hover:bg-red-700 text-white">
                                Xóa vĩnh viễn
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="hidden md:block">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[180px] font-bold">Thời gian</TableHead>
              <TableHead className="w-[150px] font-bold text-center">Thao tác</TableHead>
              <TableHead className="w-[250px] font-bold">Đối tượng</TableHead>
              <TableHead className="font-bold">Nội dung chi tiết</TableHead>
              <TableHead className="w-[150px] font-bold text-right">Người thực hiện</TableHead>
              <TableHead className="w-[120px] font-bold text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                  Đang tải lịch sử hoạt động...
                </TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-400 italic">
                  Không tìm thấy lịch sử nào phù hợp với bộ lọc.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((move) => (
                <TableRow key={move.id} className="hover:bg-gray-50 transition-colors">

                  {/* THỜI GIAN */}
                  <TableCell className="font-mono text-xs text-slate-600">
                    {new Date(move.createdAt).toLocaleString("vi-VN", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit", second: "2-digit"
                    })}
                  </TableCell>

                  {/* THAO TÁC (BADGE) */}
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`${getTypeBadge(move.type)} whitespace-nowrap`}>
                      {ACTION_LABELS[move.type] || move.type}
                    </Badge>
                  </TableCell>

                  {/* THIẾT BỊ / ĐỐI TƯỢNG TÁC ĐỘNG */}
                  <TableCell>
                    {move.asset ? (
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-blue-600 text-xs">
                          {move.asset.serialNumber}
                        </span>
                        <span className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                          <Box className="w-3 h-3" /> {move.asset.product?.name || "N/A"}
                        </span>
                      </div>
                    ) : move.targetUser ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-xs">
                          {move.targetUser.username}
                        </span>
                        <span className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                          Vai trò: {move.targetUser.role}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Chung / Đã xóa</span>
                    )}
                  </TableCell>

                  {/* NỘI DUNG CHI TIẾT */}
                  <TableCell>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {move.note}
                    </p>
                  </TableCell>

                  {/* NGƯỜI THỰC HIỆN */}
                  {/* CỘT NGƯỜI THỰC HIỆN ĐÃ ĐƯỢC FIX */}
                  <TableCell className="text-right">
                    {move.user ? (
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-slate-800 text-sm">
                          {move.user.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                          @{move.user.username}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center justify-center px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-400 italic border border-slate-200">
                        Không xác định
                      </span>
                    )}
                  </TableCell>

                  {/* CỘT HÀNH ĐỘNG */}
                  <TableCell className="text-right">
	                    {move.type === "DELETE" && move.asset && move.assetId && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
	                          onClick={() => handleRestore(move.assetId!)}
                          disabled={!!processingId}
                          className="h-8 text-xs text-green-600 border-green-200 hover:bg-green-50"
                        >
                          {processingId === move.assetId ? (
                            <Spinner size="h-3 w-3 mr-1" color="text-green-600" />
                          ) : (
                            <RotateCcw className="w-3 h-3 mr-1" />
                          )}

                        </Button>

                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={!!processingId}
                                className="h-8 text-xs px-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                  Xóa vĩnh viễn thiết bị
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-base text-slate-600 mt-2">
                                  Hành động này không thể hoàn tác. <br />Bạn có chắc muốn xóa vĩnh viễn thiết bị này khỏi hệ thống?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-6">
                                <AlertDialogCancel className="border-slate-200">Cancel</AlertDialogCancel>
                                <AlertDialogAction
	                                  onClick={() => handlePermanentDelete(move.assetId!)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Delete Permanently
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    )}
                  </TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* ================= PAGINATION ================= */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col gap-3 mt-4 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(p)}
                className={`w-9 h-9 p-0 ${p === page ? "bg-slate-900 text-white" : ""}`}
              >
                {p}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

    </div>
  );
}
