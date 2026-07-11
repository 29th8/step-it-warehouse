"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  MoreHorizontal, Trash, Eye, Loader2,
  Box, Tag, Activity, Calendar, FileText, Settings, X, Save, Edit3, Layers, MapPin, Clock, CalendarClock, PackageCheck, MonitorSpeaker, Cpu
} from "lucide-react";

import { handleApiResponse } from "@/lib/api-handler";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AssemblyConfigDialog } from "@/components/inventory/assembly-config-dialog";

// ==========================================
// 1. INTERFACES
// ==========================================

interface Rack { id: string; name: string; warehouseId: string; }
interface Product {
  id: string;
  name: string;
  category?: string;
  productCategory?: { isMain?: boolean };
}
interface Warehouse { id: string; name: string; }
interface StockMovement {
  id: string; type: string; note: string; createdAt: string;
  user?: { name: string; username: string; };
}

interface AssetDetail {
  id: string;
  serialNumber: string;
  status: string;
  notes?: string;
  owner?: string | null;
  productId: string;
  warehouseId: string;
  rackId?: string | null;
  rackUnit?: number | null;
  uHeight?: number;
  parentId?: string | null;
  product?: Product;
  warehouse?: Warehouse;
  rack?: Rack;
  movements?: StockMovement[];
  parent?: AssetDetail;
  components?: AssetDetail[];
  rentalContracts?: any[];
  createdAt: string;
}

interface AssetActionMenuProps {
  asset: { id: string; serialNumber: string };
  onRefresh: () => void;
  hideTrigger?: boolean;
  openToken?: number;
  onDetailClose?: () => void;
}

interface FormDataState {
  serialNumber: string;
  status: string;
  notes: string;
  owner: string;
  productId: string;
  warehouseId: string;
  rackId: string;
  rackUnit: string;
  uHeight: string;
  parentId: string; // "none" = không có cha
}

export function AssetActionMenu({ asset, onRefresh, hideTrigger = false, openToken, onDetailClose }: AssetActionMenuProps) {
  // ================= STATE =================
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAssemblyOpen, setIsAssemblyOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [detailData, setDetailData] = useState<AssetDetail | null>(null);

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [warehousesList, setWarehousesList] = useState<Warehouse[]>([]);
  const [racksList, setRacksList] = useState<Rack[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [parentsList, setParentsList] = useState<{ id: string; serialNumber: string; product: { name: string } }[]>([]);
  const [parentSearch, setParentSearch] = useState("");

  const [formData, setFormData] = useState<FormDataState>({
    serialNumber: "", status: "", notes: "", owner: "",
    productId: "", warehouseId: "", rackId: "", rackUnit: "", uHeight: "1",
    parentId: "none",
  });
  const selectedEditProduct = productsList.find(p => p.id === formData.productId) || detailData?.product;
  const selectedEditProductIsMain = selectedEditProduct?.productCategory?.isMain === true;
  const selectedEditProductIsComponent = selectedEditProduct?.productCategory?.isMain === false;
  const detailProductIsMain = detailData?.product?.productCategory?.isMain === true;

  const STATUS_LABELS: Record<string, string> = {
    IN_STOCK: "Trong kho",
    RESERVED: "Đã giữ",
    INSTALLED: "Đã lắp trong server",
    DEPLOYED: "Đang sử dụng",
    HANDED_OVER: "Đã bàn giao",
    RENTED: "Đang cho thuê",
    MAINTENANCE: "Đang bảo trì",
    FAULTY: "Hỏng",
    DISPOSED: "Thanh lý"
  };

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
    HARD_DELETE: "Xóa thiết bị vĩnh viễn",
    HANDOVER: "Bàn giao vật tư",
    HANDOVER_RETURN: "Hoàn trả vật tư"
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DEPLOYED": return "bg-blue-100 text-blue-700 border-blue-200";
      case "INSTALLED": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "HANDED_OVER": return "bg-violet-100 text-violet-700 border-violet-200";
      case "IN_STOCK": return "bg-green-100 text-green-800 border-green-200";
      case "RENTED": return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "FAULTY": return "bg-red-100 text-red-700 border-red-200";
      case "MAINTENANCE": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "DISPOSED": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // ================= HANDLERS =================

  const parseList = async (res: Response) => {
    try {
      const json = await res.json();
      if (Array.isArray(json)) return json;
      if (json && Array.isArray(json.data)) return json.data;
      return [];
    } catch { return []; }
  };

  const handleOpenDetail = async () => {
    setIsDetailOpen(true);
    setIsEditMode(false);
    setIsLoading(true);

    try {
      const [assetRes, productsRes, warehousesRes, racksRes, parentsRes] = await Promise.all([
        fetch(`/api/assets/${asset.id}`),
        fetch("/api/products"),
        fetch("/api/warehouses"),
        fetch("/api/racks"),
        fetch("/api/assets?tabFilter=main&pageSize=100&page=1")
      ]);

      if (!assetRes.ok) throw new Error("Lỗi tải dữ liệu thiết bị");

      const assetJson = await assetRes.json();
      const assetData: AssetDetail = assetJson.data || assetJson;
      setDetailData(assetData);

      setProductsList(await parseList(productsRes));
      setWarehousesList(await parseList(warehousesRes));
      setRacksList(await parseList(racksRes));
      const parentsData = await parentsRes.json();
      const parentItems = Array.isArray(parentsData) ? parentsData : parentsData.data || [];
      setParentsList(parentItems.filter((p: any) => p.id !== asset.id));

      setProductSearch("");
      setParentSearch("");
      setFormData({
        serialNumber: assetData.serialNumber || "",
        status: assetData.status || "IN_STOCK",
        notes: assetData.notes || "",
        owner: assetData.owner || "",
        productId: assetData.productId || assetData.product?.id || "",
        warehouseId: assetData.warehouseId || assetData.warehouse?.id || "",
        rackId: assetData.rackId || assetData.rack?.id || "none",
        rackUnit: assetData.rackUnit ? assetData.rackUnit.toString() : "",
        uHeight: assetData.uHeight ? assetData.uHeight.toString() : "1",
        parentId: assetData.parentId || "none",
      });

    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi tải dữ liệu chi tiết");
      setIsDetailOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          rackId: formData.rackId === "none" || formData.rackId === "" ? null : formData.rackId,
          rackUnit: selectedEditProductIsMain && formData.rackUnit ? parseInt(formData.rackUnit) : null,
          parentId: selectedEditProductIsMain || formData.parentId === "none" ? null : formData.parentId
        }),
      });

      await handleApiResponse(res, "Cập nhật thành công");

      setIsEditMode(false);
      onRefresh();
      handleOpenDetail();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      await handleApiResponse(res, "Đã xóa thiết bị");
      setIsDeleteOpen(false);
      onRefresh();
    } catch (error) {
      toast.error("Lỗi khi xóa");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (openToken !== undefined) {
      handleOpenDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openToken]);

  return (
    <>
      {!hideTrigger && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border shadow-md z-50">
            <DropdownMenuItem onClick={handleOpenDetail} className="cursor-pointer gap-2">
              <Eye size={14} className="text-blue-600" /> Chi tiết & Sửa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="cursor-pointer gap-2 text-red-600">
              <Trash size={14} /> Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={isDetailOpen} onOpenChange={(open) => {
        if (!open) { setIsDetailOpen(false); setIsEditMode(false); onDetailClose?.(); }
      }}>
        <DialogContent className="bg-white sm:max-w-[900px] h-[90vh] p-0 overflow-hidden shadow-lg border-none flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b bg-slate-50">
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <Box className="w-5 h-5 text-blue-600" />
              {isEditMode ? "Chỉnh sửa thiết bị" : "Chi tiết thiết bị"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {isLoading || !detailData ? (
              <div className="flex flex-col items-center justify-center h-[200px] p-6">
                <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
                <p className="text-sm text-slate-500 mt-2">Đang tải dữ liệu...</p>
              </div>
            ) : (
              <>
                {!isEditMode ? (
                  // ================= CHẾ ĐỘ XEM (VIEW MODE) =================
                  <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto min-h-0 flex-1">
                      {/* CỘT TRÁI */}
                      <div className="space-y-6">
                        {/* SECTION 1: THÔNG TIN THIẾT BỊ */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Tag className="w-3 h-3" /> Sản phẩm</p>
                              <p className="font-extrabold text-slate-900 text-lg">{detailData.product?.name || "N/A"}</p>
                              <p className="text-sm text-slate-500 mt-0.5">Mã loại: <Badge variant="secondary" className="font-mono ml-1">{detailData.product?.category || "N/A"}</Badge></p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className={`border-none ${getStatusColor(detailData.status)}`}>
                                {STATUS_LABELS[detailData.status] || detailData.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                              <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1"><Settings className="w-3.5 h-3.5" /> Serial Number</p>
                              <p className="font-mono font-bold text-blue-700 text-base break-all">{detailData.serialNumber}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1"><Calendar className="w-3.5 h-3.5" /> Ngày nhập kho</p>
                              <p className="font-medium text-slate-800">
                                {new Date(detailData.createdAt).toLocaleDateString("vi-VN")}
                              </p>
                            </div>
                          </div>
                          {detailData.owner && (
                            <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                              <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1"><MonitorSpeaker className="w-3.5 h-3.5" /> Chủ sở hữu</p>
                              <p className="font-semibold text-amber-800">{detailData.owner}</p>
                            </div>
                          )}

                          {/* Cảnh báo: Thuộc về Parent */}
                          {detailData.parent && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center gap-3">
                              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-full">
                                <Layers className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-indigo-700 uppercase">Gắn vào thiết bị mẹ</p>
                                <p className="text-sm font-medium text-indigo-900 mt-0.5">
                                  SN: {detailData.parent.serialNumber} <span className="text-indigo-500 font-normal">({detailData.parent.product?.name})</span>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECTION 2: VỊ TRÍ HẠ TẦNG */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                          <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-3 uppercase tracking-wider"><MapPin className="w-3.5 h-3.5" /> Vị trí hạ tầng</p>
                          <div className="grid grid-cols-2 gap-y-4 text-sm">
                            <div>
                              <p className="text-slate-400 text-xs mb-0.5">Kho hàng:</p>
                              <p className="font-bold text-slate-800">{detailData.warehouse?.name || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-xs mb-0.5">Tủ Rack & Slot U:</p>
                              {detailData.rack ? (
                                <p className="font-medium text-blue-700 flex flex-wrap items-center gap-1.5">
                                  {detailData.rack.name}
                                  {detailProductIsMain && detailData.rackUnit && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold">
                                      U{detailData.rackUnit} {detailData.uHeight && detailData.uHeight > 1 ? `(${detailData.uHeight}U)` : ""}
                                    </Badge>
                                  )}
                                </p>
                              ) : (
                                <p className="font-medium text-slate-400 italic">Chưa lên Rack</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* SECTION 3: LINH KIỆN GẮN VÀO (Nếu có) */}
                        {(!detailData.parent) && (
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-3 uppercase tracking-wider"><Cpu className="w-3.5 h-3.5" /> Linh kiện gắn kèm ({detailData.components?.length || 0})</p>
                            {detailData.components && detailData.components.length > 0 ? (() => {
                              const CAT_ORDER = ["CPU", "MEMORY", "STORAGE", "GPU", "NETWORK", "ACCESSORY"];
                              const CAT_LABELS: Record<string, string> = {
                                CPU: "Vi xử lý (CPU)", MEMORY: "RAM", STORAGE: "Ổ cứng",
                                GPU: "Card đồ họa", NETWORK: "Card mạng", ACCESSORY: "Phụ kiện",
                              };
                              const CAT_COLORS: Record<string, string> = {
                                CPU: "bg-blue-50 text-blue-700 border-blue-200",
                                MEMORY: "bg-purple-50 text-purple-700 border-purple-200",
                                STORAGE: "bg-orange-50 text-orange-700 border-orange-200",
                                GPU: "bg-green-50 text-green-700 border-green-200",
                                NETWORK: "bg-cyan-50 text-cyan-700 border-cyan-200",
                                ACCESSORY: "bg-slate-100 text-slate-600 border-slate-200",
                              };
                              const grouped = detailData.components.reduce((acc: Record<string, AssetDetail[]>, comp) => {
                                const cat = comp.product?.category || "OTHER";
                                if (!acc[cat]) acc[cat] = [];
                                acc[cat].push(comp);
                                return acc;
                              }, {});
                              const sortedCats = [
                                ...CAT_ORDER.filter(c => grouped[c]),
                                ...Object.keys(grouped).filter(c => !CAT_ORDER.includes(c)),
                              ];
                              return (
                                <div className="space-y-2.5">
                                  {sortedCats.map(cat => (
                                    <div key={cat} className="space-y-1">
                                      <div className={`flex items-center gap-2 px-2 py-1 rounded border text-[11px] font-bold ${CAT_COLORS[cat] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                                        <span>{CAT_LABELS[cat] || cat}</span>
                                        <span className="ml-auto opacity-60">{grouped[cat].length}</span>
                                      </div>
                                      {grouped[cat].map(comp => (
                                        <div key={comp.id} className="text-sm bg-white border rounded-md p-2 flex justify-between items-center shadow-sm ml-1">
                                          <div>
                                            <p className="font-bold text-slate-700">{comp.product?.name}</p>
                                            <p className="text-xs font-mono text-slate-500 mt-0.5">SN: {comp.serialNumber}</p>
                                          </div>
                                          <Badge variant="outline" className={`text-[10px] ${getStatusColor(comp.status)} border-transparent py-0`}>
                                            {STATUS_LABELS[comp.status] || comp.status}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              );
                            })() : (
                              <p className="text-sm text-slate-400 italic">Không có linh kiện nào.</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* CỘT PHẢI */}
                      <div className="space-y-6 flex flex-col h-full">

                        {/* SECTION 4: HỢP ĐỒNG THUÊ */}
                        {(() => {
                          const activeRental = detailData.rentalContracts?.find(c => c.status === "ACTIVE" || c.status === "EXPIRED");
                          if (activeRental) {
                            const endDate = new Date(activeRental.endDate);
                            const diffTime = endDate.getTime() - new Date().getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            let rentalBadgeBg = "bg-green-100 border-green-200";
                            let rentalBadgeText = "text-green-700";
                            if (diffDays <= 0) {
                              rentalBadgeBg = "bg-red-100 border-red-200";
                              rentalBadgeText = "text-red-700";
                            } else if (diffDays <= 7) {
                              rentalBadgeBg = "bg-yellow-100 border-yellow-200";
                              rentalBadgeText = "text-yellow-700";
                            }

                            return (
                              <div className={`p-4 rounded-lg border ${rentalBadgeBg}`}>
                                <div className="flex justify-between items-center mb-3">
                                  <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider"><FileText className="w-3.5 h-3.5" /> Hợp đồng thuê</p>
                                  <Badge variant="outline" className={`bg-white font-bold ${rentalBadgeText} border-transparent`}>{diffDays <= 0 ? "Hết hạn" : `Còn ${diffDays} ngày`}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-slate-500 text-xs">Khách hàng:</p>
                                    <p className={`font-bold ${rentalBadgeText}`}>{activeRental.customerName}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 text-xs">Giao trả lúc:</p>
                                    <p className={`font-bold ${rentalBadgeText}`}>{endDate.toLocaleDateString('vi-VN')}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* SECTION 5: GHI CHÚ */}
                        <div className="bg-yellow-50/50 p-4 rounded-lg border border-yellow-100 shadow-sm shrink-0">
                          <p className="text-xs font-bold text-yellow-800 flex items-center gap-1.5 mb-2 uppercase tracking-wider"><FileText className="w-3.5 h-3.5" /> Ghi chú thiết bị</p>
                          <div className="text-sm text-yellow-900 whitespace-pre-wrap leading-relaxed bg-white border border-yellow-200/50 p-2.5 rounded-md min-h-[60px]">
                            {detailData.notes || <span className="text-yellow-700/60 italic">Không có ghi chú. (Có thể thêm khi chỉnh sửa)</span>}
                          </div>
                        </div>

                        {/* SECTION 6: LỊCH SỬ HOẠT ĐỘNG */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex-1 flex flex-col overflow-hidden min-h-[200px]">
                          <p className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-1.5 uppercase tracking-wider shrink-0"><Activity className="w-3.5 h-3.5" /> Lịch sử hoạt động</p>
                          <div className="overflow-y-auto pr-2 space-y-0 relative ml-2 flex-1">
                            {detailData.movements && detailData.movements.length > 0 && (
                              <div className="absolute top-2 bottom-2 left-[5px] w-0.5 bg-slate-200 z-0"></div>
                            )}
                            {!detailData.movements || detailData.movements.length === 0 ? (
                              <p className="text-sm italic text-slate-400 pl-4 border-l-2 border-slate-100">Chưa có lịch sử.</p>
                            ) : (
                              detailData.movements.map((move: any, idx: number) => {
                                const isDelete = move.type === "DELETE" || move.type === "HARD_DELETE";
                                const isRestore = move.type === "RESTORE";

                                let markerColor = "bg-blue-500 ring-white";
                                if (isDelete) markerColor = "bg-red-500 ring-white text-red-100";
                                if (isRestore) markerColor = "bg-green-500 ring-white text-green-100";

                                return (
                                  <div key={move.id} className="relative z-10 pl-6 pb-6 last:pb-2">
                                    <div className={`absolute left-0 top-1 w-3 h-3 rounded-full ring-4 ${markerColor}`}></div>
                                    <div className="flex flex-col xl:flex-row xl:items-baseline gap-1 xl:gap-3 mb-1">
                                      <Badge variant="outline" className={`text-[10px] w-fit px-2 py-0 border-transparent shadow-sm ${isDelete ? 'bg-red-100 text-red-700' : isRestore ? 'bg-green-100 text-green-700' : 'bg-white text-slate-700'}`}>
                                        {ACTION_LABELS[move.type] || move.type}
                                      </Badge>
                                      <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                        {new Date(move.createdAt).toLocaleString("vi-VN", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        {move.user && <span className="text-[11px] font-normal text-slate-400">bởi <strong className="text-slate-600">{move.user.name || move.user.username}</strong></span>}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200 shadow-sm mt-1.5 leading-relaxed">
                                      {move.note}
                                    </p>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t bg-white shrink-0">
                      {detailProductIsMain && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAssemblyOpen(true)}
                          className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <Layers className="w-4 h-4 mr-2" /> Lắp ráp
                        </Button>
                      )}
                      <Button onClick={() => setIsEditMode(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Edit3 className="w-4 h-4 mr-2" /> Chỉnh sửa thông tin
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  // ================= CHẾ ĐỘ SỬA (EDIT MODE) =================
                  <form onSubmit={handleSaveEdit} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 animate-in slide-in-from-right-4 duration-200">

                    {/* SẢN PHẨM MODEL */}
                    <div className="space-y-2 border p-4 rounded-lg bg-blue-50/30">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-blue-500" /> Sản phẩm / Model
                      </label>
                      <Input
                        placeholder="Tìm theo tên hoặc model number..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        className="bg-white mb-1"
                      />
                      <Select
                        value={formData.productId}
                        onValueChange={(v) => {
                          const product = productsList.find(p => p.id === v);
                          const isMain = product?.productCategory?.isMain === true;
                          setFormData({
                            ...formData,
                            productId: v,
                            parentId: isMain ? "none" : formData.parentId,
                            status: isMain && formData.status === "INSTALLED" ? "IN_STOCK" : formData.status,
                          });
                        }}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Chọn sản phẩm" />
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-[220px]">
                          {productsList
                            .filter(p => {
                              if (!productSearch.trim()) return true;
                              const q = productSearch.toLowerCase();
                              return p.name.toLowerCase().includes(q);
                            })
                            .map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="font-medium">{p.name}</span>
                                {p.category && <span className="text-xs text-slate-400 ml-1">[{p.category}]</span>}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {formData.productId && productsList.find(p => p.id === formData.productId) && (
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          Đang chọn: {productsList.find(p => p.id === formData.productId)?.name}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Mã Serial (SN)</label>
                        <Input
                          value={formData.serialNumber}
                          onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                          className="focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Trạng thái</label>
                        <Select
                          value={formData.status}
                          onValueChange={(v) => {
                            if (v === "IN_STOCK" && formData.parentId && formData.parentId !== "none") {
                              toast.error("Không thể đặt 'Trong kho' khi thiết bị đang lắp vào server. Hãy bỏ chọn thiết bị cha trước.");
                              return;
                            }
                            setFormData({ ...formData, status: v });
                          }}
                        >
                          <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="IN_STOCK" disabled={!!(!selectedEditProductIsMain && formData.parentId && formData.parentId !== "none")}>
                              Trong kho {formData.parentId && formData.parentId !== "none" && "🚫"}
                            </SelectItem>
                            <SelectItem value="INSTALLED" disabled={selectedEditProductIsMain || !formData.parentId || formData.parentId === "none"}>
                              Đã lắp trong server
                            </SelectItem>
                            <SelectItem value="DEPLOYED">Đang sử dụng</SelectItem>
                            <SelectItem value="HANDED_OVER">Đã bàn giao</SelectItem>
                            <SelectItem value="MAINTENANCE">Đang bảo trì</SelectItem>
                            <SelectItem value="RENTED">Đang cho thuê</SelectItem>
                            <SelectItem value="FAULTY">Hỏng</SelectItem>
                            <SelectItem value="DISPOSED">Thanh lý</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* CHỦ SỞ HỮU */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <MonitorSpeaker className="w-4 h-4 text-amber-500" /> Chủ sở hữu (Owner)
                      </label>
                      <Input
                        placeholder="VD: DevOps Team / Nguyễn Văn A"
                        value={formData.owner}
                        onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-4 border p-4 rounded-lg bg-slate-50/50">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Box className="w-4 h-4" /> Vị trí (Warehouse)
                        </label>
                        <Select
                          value={formData.warehouseId}
                          onValueChange={(v) => setFormData({ ...formData, warehouseId: v, rackId: "none", rackUnit: "" })}
                          disabled={warehousesList.length === 0}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder={warehousesList.length > 0 ? "Chọn kho hàng" : "Không có dữ liệu"} />
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-[200px]">
                            {Array.isArray(warehousesList) && warehousesList.length > 0 ? (
                              warehousesList.map((w) => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                              ))
                            ) : (
                              <SelectItem value="empty" disabled>Không có dữ liệu kho</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.warehouseId && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                          <div className="col-span-2 sm:col-span-1 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Tủ Rack</label>
                            <Select
                              value={formData.rackId}
                              onValueChange={(v) => setFormData({ ...formData, rackId: v })}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Chọn Tủ" />
                              </SelectTrigger>
                              <SelectContent className="bg-white max-h-[200px]">
                                <SelectItem value="none" className="text-slate-400 italic">-- Không lên Rack --</SelectItem>
                                {Array.isArray(racksList) && racksList
                                  .filter(r => r.warehouseId === formData.warehouseId)
                                  .map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedEditProductIsMain && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">Vị trí U (Đáy)</label>
                              <Input
                                type="number"
                                min="1"
                                placeholder="Vd: 10"
                                value={formData.rackUnit}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "" || Number(value) >= 1) setFormData({ ...formData, rackUnit: value });
                                }}
                                disabled={formData.rackId === "none" || !formData.rackId}
                                className="bg-white"
                              />
                            </div>
                          )}

                        </div>
                      )}
                    </div>

                    {selectedEditProductIsComponent && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-500" /> Thiết bị cha (lắp ráp vào)
                        </label>
                        <Input
                          placeholder="Tìm server theo serial hoặc tên..."
                          value={parentSearch}
                          onChange={e => setParentSearch(e.target.value)}
                          className="bg-white h-8 text-sm"
                        />
                        <Select
                          value={formData.parentId}
                          onValueChange={v => setFormData({
                            ...formData,
                            parentId: v,
                            status: v && v !== "none" ? "INSTALLED" : formData.status,
                          })}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="-- Không lắp vào server nào --" />
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-52">
                            <SelectItem value="none">-- Không lắp vào server nào --</SelectItem>
                            {parentsList
                              .filter(p => {
                                if (!parentSearch.trim()) return true;
                                const q = parentSearch.toLowerCase();
                                return p.serialNumber.toLowerCase().includes(q) ||
                                  p.product?.name.toLowerCase().includes(q);
                              })
                              .map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  <span className="font-mono text-xs text-blue-600 mr-2">{p.serialNumber}</span>
                                  <span className="text-slate-700">{p.product?.name}</span>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {formData.parentId !== "none" && (
                          <p className="text-xs text-blue-600">
                            ✓ Sẽ lắp vào: {parentsList.find(p => p.id === formData.parentId)?.serialNumber} — {parentsList.find(p => p.id === formData.parentId)?.product?.name}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Ghi chú tình trạng</label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        placeholder="Mô tả tình trạng hiện tại..."
                        className="bg-white"
                      />
                    </div>

                    <DialogFooter className="p-4 border-t bg-slate-50 flex justify-end gap-2 -mx-6 -mb-6 mt-6">
                      <Button type="button" variant="outline" onClick={() => setIsEditMode(false)} disabled={isSaving}>
                        <X className="w-4 h-4 mr-2" /> Hủy
                      </Button>
                      <Button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AssemblyConfigDialog
        open={isAssemblyOpen}
        onOpenChange={setIsAssemblyOpen}
        parentAsset={detailData ? {
          id: detailData.id,
          serialNumber: detailData.serialNumber,
          product: {
            id: detailData.product?.id || detailData.productId,
            name: detailData.product?.name || "N/A",
            category: detailData.product?.category,
            productCategory: detailData.product?.productCategory as any,
          },
          warehouse: detailData.warehouse,
          owner: detailData.owner,
          parentId: detailData.parentId,
        } : null}
        onSaved={() => {
          onRefresh();
          handleOpenDetail();
        }}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-white border-none shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash className="w-5 h-5" /> Xóa mềm thiết bị?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Bạn sắp đưa thiết bị có SN: <strong className="text-slate-900">{asset.serialNumber}</strong> vào <strong>Thùng rác</strong>. <br /><br />
              Lịch sử của thiết bị vẫn sẽ được giữ lại. Nếu xóa nhầm, bạn có thể khôi phục thiết bị từ trang Thùng rác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 mt-4">
            <AlertDialogCancel className="bg-white">Quay lại</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-orange-500 hover:bg-orange-600 text-white border-none">
              Tôi hiểu, hãy chuyển vào Thùng rác
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
