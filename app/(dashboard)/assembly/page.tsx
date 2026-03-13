"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Layers, Server, Cpu, Link as LinkIcon, Unlink, RefreshCw, Loader2, CheckSquare, Trash2, Search, X, Filter, ArrowRightLeft
} from "lucide-react";
import {
  getGenerations,
  getCapacities,
  getStorageTypes,
  getStorageInterfaces,
  getCpuSeries
} from "@/lib/product-options";

// TYPESCRIPT INTERFACES
interface Product { id: string; name: string; category: string; }
interface Warehouse { id: string; name: string; }
interface Asset {
  id: string;
  serialNumber: string;
  product: Product;
  warehouse?: Warehouse;
  owner?: string;
  parentId?: string | null;
  parent?: Asset;
}
interface GroupedComponents {
  [parentId: string]: {
    parentDetails: Asset;
    components: Asset[];
  }
}

export default function AssemblyPage() {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // States cho Modal Lắp ráp hàng loạt
  const [isAssembleModalOpen, setIsAssembleModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Asset | null>(null);
  const [availableComponents, setAvailableComponents] = useState<Asset[]>([]);
  const [componentsToAttach, setComponentsToAttach] = useState<string[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // State cho Xác nhận Tháo rời
  const [detachmentInfo, setDetachmentInfo] = useState<{ components: Asset[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State cho Di chuyển linh kiện
  const [moveComponent, setMoveComponent] = useState<Asset | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string>("");
  const [isMoving, setIsMoving] = useState(false);

  // Warehouse list for filter dropdown
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // =============================================
  // FILTER STATES CHO POPUP
  // =============================================
  const [searchQuery, setSearchQuery] = useState("");
  const [selCategory, setSelCategory] = useState("ALL");
  const [selWarehouse, setSelWarehouse] = useState("ALL");
  const [selOwner, setSelOwner] = useState("");
  const [selGeneration, setSelGeneration] = useState("");
  const [selCapacity, setSelCapacity] = useState("");
  const [selAttrType, setSelAttrType] = useState("");
  const [selInterface, setSelInterface] = useState("");
  const [selSeries, setSelSeries] = useState("");

  // =============================================
  // DATA FETCHING
  // =============================================
  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetsRes, warehousesRes] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/warehouses"),
      ]);
      const assetsData = await assetsRes.json();
      setAllAssets(Array.isArray(assetsData) ? assetsData : []);
      const whData = await warehousesRes.json();
      setWarehouses(Array.isArray(whData) ? whData : []);
    } catch (e) { toast.error("Lỗi tải dữ liệu thiết bị"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // =============================================
  // FETCH COMPONENTS KHI FILTER THAY ĐỔI (DEBOUNCED)
  // =============================================
  const fetchFilteredComponents = useCallback(async () => {
    setIsModalLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("component", "true");

      if (searchQuery) params.append("search", searchQuery);
      if (selCategory !== "ALL") params.append("category", selCategory);
      if (selWarehouse !== "ALL") params.append("warehouseId", selWarehouse);
      if (selOwner) params.append("owner", selOwner);

      if (selCategory === "MEMORY") {
        if (selGeneration && selGeneration !== "none") params.append("generation", selGeneration);
        if (selCapacity && selCapacity !== "none") params.append("capacity", selCapacity);
      }
      if (selCategory === "STORAGE") {
        if (selAttrType && selAttrType !== "none") params.append("attrType", selAttrType);
        if (selCapacity && selCapacity !== "none") params.append("capacity", selCapacity);
        if (selInterface && selInterface !== "none") params.append("interface", selInterface);
      }
      if (selCategory === "CPU") {
        if (selSeries && selSeries !== "none") params.append("series", selSeries);
      }

      params.append("take", "50");

      const res = await fetch(`/api/assets?${params.toString()}`);
      const data = await res.json();
      setAvailableComponents(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Lỗi tải danh sách linh kiện");
      setAvailableComponents([]);
    } finally {
      setIsModalLoading(false);
    }
  }, [searchQuery, selCategory, selWarehouse, selOwner, selGeneration, selCapacity, selAttrType, selInterface, selSeries]);

  // Debounced fetch khi filter thay đổi (chỉ khi modal đang mở)
  useEffect(() => {
    if (!isAssembleModalOpen) return;
    const timer = setTimeout(() => { fetchFilteredComponents(); }, 400);
    return () => clearTimeout(timer);
  }, [isAssembleModalOpen, fetchFilteredComponents]);

  // =============================================
  // RESET & MỞ MODAL
  // =============================================
  const resetFilters = () => {
    setSearchQuery(""); setSelCategory("ALL"); setSelWarehouse("ALL"); setSelOwner("");
    setSelGeneration(""); setSelCapacity(""); setSelAttrType(""); setSelInterface(""); setSelSeries("");
  };

  const handleOpenAssembleModal = (parent: Asset) => {
    setSelectedParent(parent);
    setComponentsToAttach([]);
    resetFilters();
    setIsAssembleModalOpen(true);
  };

  const onCategoryChange = (val: string) => {
    setSelCategory(val);
    setSelGeneration(""); setSelCapacity(""); setSelAttrType(""); setSelInterface(""); setSelSeries("");
  };

  // =============================================
  // ACTIVE FILTER BADGES
  // =============================================
  const activeFilterBadges = useMemo(() => {
    const badges: { key: string; label: string; value: string }[] = [];
    if (selCategory !== "ALL") badges.push({ key: "category", label: "Danh mục", value: selCategory });
    if (selWarehouse !== "ALL") {
      const w = warehouses.find(x => x.id === selWarehouse);
      badges.push({ key: "warehouse", label: "Kho", value: w?.name || selWarehouse });
    }
    if (selOwner) badges.push({ key: "owner", label: "Chủ sở hữu", value: selOwner });
    if (selGeneration && selGeneration !== "none") badges.push({ key: "generation", label: "RAM", value: selGeneration });
    if (selCapacity && selCapacity !== "none") badges.push({ key: "capacity", label: "Dung lượng", value: selCapacity });
    if (selAttrType && selAttrType !== "none") badges.push({ key: "attrType", label: "Loại ổ", value: selAttrType });
    if (selInterface && selInterface !== "none") badges.push({ key: "interface", label: "Giao tiếp", value: selInterface });
    if (selSeries && selSeries !== "none") badges.push({ key: "series", label: "CPU Series", value: selSeries });
    return badges;
  }, [selCategory, selWarehouse, selOwner, selGeneration, selCapacity, selAttrType, selInterface, selSeries, warehouses]);

  const removeBadge = (key: string) => {
    if (key === "category") onCategoryChange("ALL");
    else if (key === "warehouse") setSelWarehouse("ALL");
    else if (key === "owner") setSelOwner("");
    else if (key === "generation") setSelGeneration("");
    else if (key === "capacity") setSelCapacity("");
    else if (key === "attrType") setSelAttrType("");
    else if (key === "interface") setSelInterface("");
    else if (key === "series") setSelSeries("");
  };

  // =============================================
  // HANDLERS LẮP / THÁO
  // =============================================
  const handleAttachBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (componentsToAttach.length === 0) return toast.warning("Vui lòng chọn ít nhất một linh kiện");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/assembly", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'ATTACH_BULK', parentId: selectedParent?.id, componentIds: componentsToAttach }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const result = await res.json();
      toast.success(result.data.message);
      setIsAssembleModalOpen(false);
      fetchData();
    } catch (error: any) { toast.error(error.message); }
    finally { setIsSubmitting(false); }
  };

  const handleDetachBulk = async () => {
    if (!detachmentInfo) return;
    setIsSubmitting(true);
    try {
      const componentIds = detachmentInfo.components.map(c => c.id);
      const res = await fetch("/api/assembly", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'DETACH_BULK', componentIds }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const result = await res.json();
      toast.success(result.data.message);
      setDetachmentInfo(null);
      fetchData();
    } catch (error: any) { toast.error(error.message); }
    finally { setIsSubmitting(false); }
  };

  // =============================================
  // LỌC VÀ NHÓM DỮ LIỆU
  // =============================================
  const parentAssets = useMemo(() => allAssets.filter(a => ['SERVER'].includes(a.product.category)), [allAssets]);

  const groupedAttachedComponents: GroupedComponents = useMemo(() => {
    return allAssets.reduce((acc: GroupedComponents, asset: Asset) => {
      if (asset.parentId && asset.parent) {
        if (!acc[asset.parentId]) {
          acc[asset.parentId] = {
            parentDetails: asset.parent as Asset,
            components: [],
          };
        }
        acc[asset.parentId].components.push(asset);
      }
      return acc;
    }, {});
  }, [allAssets]);

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900"><Layers className="w-7 h-7 text-blue-600" />Trung tâm Tích hợp Thiết bị</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý cấu hình chi tiết của các thiết bị.</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} className="shrink-0"><RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} /></Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">

        {/* CỘT TRÁI: MÁY MẸ */}
        <div className="space-y-4">
          <h2 className="font-bold text-lg flex items-center gap-2"><Server className="text-slate-500" /> Thiết bị lắp ráp</h2>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/70"><TableRow><TableHead>Thiết bị</TableHead><TableHead className="w-32 text-right">Hành động</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={2} className="text-center h-24">Đang tải...</TableCell></TableRow>
                  : parentAssets.length === 0 ? <TableRow><TableCell colSpan={2} className="text-center h-24 text-slate-400">Không có thiết bị nguyên chiếc nào.</TableCell></TableRow>
                    : parentAssets.map(asset => (
                      <TableRow key={asset.id}>
                        <TableCell><p className="font-bold">{asset.product.name}</p><p className="font-mono text-xs text-slate-500">{asset.serialNumber}</p></TableCell>
                        <TableCell className="text-right"><Button size="sm" onClick={() => handleOpenAssembleModal(asset)}><LinkIcon className="w-4 h-4 mr-2" /> Lắp ráp</Button></TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* CỘT PHẢI: ACCORDION GROUPED COMPONENTS */}
        <div className="space-y-4">
          <h2 className="font-bold text-lg flex items-center gap-2"><Cpu className="text-slate-500" /> Cấu hình thiết bị hiện tại</h2>
          <Accordion type="multiple" className="w-full space-y-3">
            {Object.keys(groupedAttachedComponents).length === 0 && !loading ? <p className="text-slate-400 italic text-sm text-center pt-10">Chưa có thiết bị nào được lắp ráp linh kiện.</p> : null}
            {Object.values(groupedAttachedComponents).map(({ parentDetails, components }) => (
              <AccordionItem key={parentDetails.id} value={parentDetails.id} className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-slate-50/70 font-bold text-base">
                  <div className="flex flex-col items-start text-left">
                    <span>{parentDetails.product.name}</span>
                    <span className="font-mono text-xs text-slate-500">{parentDetails.serialNumber}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-slate-50/50 border-t">
                  <div className="space-y-3">
                    {components.map(comp => (
                      <div key={comp.id} className="flex justify-between items-center bg-white p-2 rounded-md border">
                        <div><p className="font-semibold text-sm">{comp.product.name}</p><p className="font-mono text-[11px] text-slate-500">{comp.serialNumber}</p></div>
                        <div className="flex items-center gap-1">
                          <Button size="xs" variant="ghost" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => { setMoveComponent(comp); setMoveTargetId(""); }}><ArrowRightLeft className="w-3 h-3 mr-1" /> Di chuyển</Button>
                          <Button size="xs" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDetachmentInfo({ components: [comp] })}><Unlink className="w-3 h-3 mr-1.5" /> Tháo</Button>
                        </div>
                      </div>
                    ))}
                    <Button size="sm" variant="destructive" className="w-full mt-4" onClick={() => setDetachmentInfo({ components })}>
                      <Trash2 className="w-4 h-4 mr-2" /> Tháo rời toàn bộ ({components.length} linh kiện)
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* =============================================
          MODAL LẮP RÁP HÀNG LOẠT (NÂNG CẤP BỘ LỌC)
         ============================================= */}
      <Dialog open={isAssembleModalOpen} onOpenChange={setIsAssembleModalOpen}>
        <DialogContent className="bg-white md:max-w-4xl">
          <DialogHeader><DialogTitle className="text-xl">Lắp linh kiện vào: {selectedParent?.serialNumber}</DialogTitle></DialogHeader>
          <form onSubmit={handleAttachBulk}>

            {/* FILTER TOOLBAR */}
            <div className="flex flex-col gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4">
              {/* Search */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Tìm theo Serial Number hoặc tên linh kiện..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-white"
                />
              </div>

              {/* Dropdown Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  Lọc:
                </div>

                {/* Category */}
                <Select value={selCategory} onValueChange={onCategoryChange}>
                  <SelectTrigger className="w-[140px] h-9 shrink-0 font-medium bg-white"><SelectValue placeholder="Danh mục" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả linh kiện</SelectItem>
                    <SelectItem value="MEMORY">RAM</SelectItem>
                    <SelectItem value="STORAGE">Ổ cứng</SelectItem>
                    <SelectItem value="CPU">Vi xử lý CPU</SelectItem>
                    <SelectItem value="GPU">Card đồ họa</SelectItem>
                    <SelectItem value="NETWORK">Card mạng</SelectItem>
                    <SelectItem value="COMPONENT">Khác</SelectItem>
                  </SelectContent>
                </Select>

                {/* Warehouse */}
                {warehouses.length > 0 && (
                  <Select value={selWarehouse} onValueChange={setSelWarehouse}>
                    <SelectTrigger className="w-[140px] h-9 shrink-0 bg-white"><SelectValue placeholder="Kho hàng" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tất cả kho</SelectItem>
                      {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}



                {/* SPEC: MEMORY */}
                {selCategory === "MEMORY" && (
                  <>
                    <Select value={selGeneration} onValueChange={setSelGeneration}>
                      <SelectTrigger className="w-[120px] h-9 shrink-0 bg-purple-50/50 border-purple-200 text-purple-700 font-medium"><SelectValue placeholder="Thế hệ" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Tất cả --</SelectItem>
                        {getGenerations().map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={selCapacity} onValueChange={setSelCapacity}>
                      <SelectTrigger className="w-[120px] h-9 shrink-0 bg-purple-50/50 border-purple-200 text-purple-700 font-medium"><SelectValue placeholder="Dung lượng" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Tất cả --</SelectItem>
                        {getCapacities().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </>
                )}

                {/* SPEC: STORAGE */}
                {selCategory === "STORAGE" && (
                  <>
                    <Select value={selAttrType} onValueChange={setSelAttrType}>
                      <SelectTrigger className="w-[120px] h-9 shrink-0 bg-orange-50/50 border-orange-200 text-orange-700 font-medium"><SelectValue placeholder="Loại" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Tất cả --</SelectItem>
                        {getStorageTypes().map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={selCapacity} onValueChange={setSelCapacity}>
                      <SelectTrigger className="w-[120px] h-9 shrink-0 bg-orange-50/50 border-orange-200 text-orange-700 font-medium"><SelectValue placeholder="Dung lượng" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Tất cả --</SelectItem>
                        {getCapacities().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={selInterface} onValueChange={setSelInterface}>
                      <SelectTrigger className="w-[120px] h-9 shrink-0 bg-orange-50/50 border-orange-200 text-orange-700 font-medium"><SelectValue placeholder="Giao tiếp" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Tất cả --</SelectItem>
                        {getStorageInterfaces().map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </>
                )}

                {/* SPEC: CPU */}
                {selCategory === "CPU" && (
                  <Select value={selSeries} onValueChange={setSelSeries}>
                    <SelectTrigger className="w-[140px] h-9 shrink-0 bg-blue-50/50 border-blue-200 text-blue-700 font-medium"><SelectValue placeholder="Dòng (Series)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Tất cả --</SelectItem>
                      {getCpuSeries().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Active Filter Badges */}
              {activeFilterBadges.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1">Đang lọc:</span>
                  {activeFilterBadges.map(f => (
                    <Badge
                      key={f.key}
                      variant="secondary"
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1 text-xs cursor-default"
                    >
                      {f.label}: {f.value}
                      <X className="w-3 h-3 cursor-pointer ml-0.5 hover:text-red-600" onClick={() => removeBadge(f.key)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* COMPONENT LIST + SELECTED */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
              <div className="flex flex-col space-y-3 max-h-[50vh] overflow-y-auto pr-3 md:border-r md:pr-6">
                {isModalLoading ? <div className="flex justify-center items-center h-24"><Loader2 className="animate-spin text-blue-600" /></div>
                  : availableComponents.length === 0 ? <p className="text-slate-500 italic text-center py-4">Không có linh kiện nào phù hợp bộ lọc.</p>
                    : <>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-medium">{availableComponents.length} linh kiện</span>
                        <Button type="button" variant="link" size="sm" onClick={() => {
                          if (componentsToAttach.length === availableComponents.length && availableComponents.length > 0) { setComponentsToAttach([]); }
                          else { setComponentsToAttach(availableComponents.map(c => c.id)); }
                        }}><CheckSquare className="w-4 h-4 mr-2" /> {componentsToAttach.length === availableComponents.length && availableComponents.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</Button>
                      </div>
                      {availableComponents.map(comp => (
                        <div key={comp.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 border has-[:checked]:bg-blue-50 has-[:checked]:border-blue-200 transition-all">
                          <Checkbox
                            id={comp.id}
                            checked={componentsToAttach.includes(comp.id)}
                            onCheckedChange={(checked) => {
                              setComponentsToAttach(prev => checked ? [...prev, comp.id] : prev.filter(id => id !== comp.id));
                            }}
                          />
                          <label htmlFor={comp.id} className="flex-1 cursor-pointer">
                            <p className="font-semibold">{comp.product.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-xs text-slate-500">{comp.serialNumber}</span>
                              {comp.owner && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 rounded font-medium">{comp.owner}</span>}
                            </div>
                          </label>
                        </div>
                      ))}
                    </>
                }
              </div>

              {/* RIGHT SIDE: SELECTED COMPONENTS */}
              <div className="flex flex-col max-h-[50vh] overflow-y-auto pl-1 pr-2">
                <h3 className="font-bold text-slate-700 pb-2 border-b mb-3">Linh kiện đã chọn ({componentsToAttach.length})</h3>
                <div className="space-y-3">
                  {componentsToAttach.length === 0 ? (
                    <p className="text-sm text-slate-500 italic text-center py-4">Chưa chọn linh kiện nào</p>
                  ) : (
                    availableComponents.filter(comp => componentsToAttach.includes(comp.id)).map(asset => (
                      <div key={asset.id} className="flex justify-between items-center border border-blue-200 p-2.5 rounded-md bg-blue-50/50">
                        <div>
                          <p className="font-semibold text-sm">{asset.product.name}</p>
                          <p className="font-mono text-xs text-slate-500">{asset.serialNumber}</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setComponentsToAttach(prev => prev.filter(id => id !== asset.id))} className="text-red-600 hover:text-red-700 hover:bg-red-100 h-8 px-3">Bỏ chọn</Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAssembleModalOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={isSubmitting || componentsToAttach.length === 0} className="bg-blue-600 text-white">
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <LinkIcon className="mr-2" />} Lắp ráp ({componentsToAttach.length}) linh kiện
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DI CHUYỂN LINH KIỆN */}
      <Dialog open={!!moveComponent} onOpenChange={(open) => !open && setMoveComponent(null)}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              Di chuyển linh kiện
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Info linh kiện */}
            <div className="bg-slate-50 p-3 rounded-lg border">
              <p className="text-sm font-bold text-slate-700">{moveComponent?.product.name}</p>
              <p className="font-mono text-xs text-slate-500">SN: {moveComponent?.serialNumber}</p>
            </div>

            {/* Chọn thiết bị đích */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Chọn thiết bị đích:</label>
              <Select value={moveTargetId} onValueChange={setMoveTargetId}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Chọn thiết bị cha..." />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-60">
                  {parentAssets
                    .filter(a => a.id !== moveComponent?.parentId)
                    .map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex flex-col">
                          <span className="font-semibold">{a.product.name}</span>
                          <span className="text-xs text-slate-500 font-mono">SN: {a.serialNumber}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveComponent(null)}>Hủy</Button>
            <Button
              type="button"
              disabled={!moveTargetId || isMoving}
              className="bg-blue-600 text-white"
              onClick={async () => {
                if (!moveComponent || !moveTargetId) return;
                setIsMoving(true);
                try {
                  const res = await fetch("/api/assets/move-component", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ componentId: moveComponent.id, targetAssetId: moveTargetId }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  toast.success(data.message);
                  setMoveComponent(null);
                  fetchData();
                } catch (error: any) {
                  toast.error(error.message || "Lỗi di chuyển linh kiện");
                } finally {
                  setIsMoving(false);
                }
              }}
            >
              {isMoving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
              {isMoving ? "Đang xử lý..." : "Di chuyển"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT XÁC NHẬN THÁO RỜI */}
      <AlertDialog open={!!detachmentInfo} onOpenChange={(open) => !open && setDetachmentInfo(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Xác nhận Tháo rời?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn tháo rời <strong>{detachmentInfo?.components.length} linh kiện</strong> khỏi máy mẹ không? Các linh kiện này sẽ trở về trạng thái "Trong kho".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDetachBulk} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin mr-2" />} Xác nhận
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}