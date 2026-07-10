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
  getStorageTypes,
  getStorageInterfaces,
  getCpuSeries
} from "@/lib/product-options";
import type { ProductCategoryOption } from "@/components/products/product-category-manager";

// TYPESCRIPT INTERFACES
interface Product { id: string; name: string; category: string; categoryName?: string; productCategory?: ProductCategoryOption; }
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

const COMPONENT_CATEGORY_ORDER = ["CPU", "MEMORY", "STORAGE", "GPU", "NETWORK", "POWER", "PSU", "FAN", "ACCESSORY"];
const COMPONENT_CATEGORY_LABELS: Record<string, string> = {
  CPU: "CPU",
  MEMORY: "RAM",
  STORAGE: "Ổ cứng / Lưu trữ",
  GPU: "Card đồ họa",
  NETWORK: "Card mạng",
  POWER: "Nguồn",
  PSU: "Nguồn",
  FAN: "Quạt",
  ACCESSORY: "Phụ kiện",
  OTHER: "Khác",
};
const COMPONENT_CATEGORY_STYLES: Record<string, string> = {
  CPU: "bg-blue-50 text-blue-700 border-blue-200",
  MEMORY: "bg-purple-50 text-purple-700 border-purple-200",
  STORAGE: "bg-orange-50 text-orange-700 border-orange-200",
  GPU: "bg-green-50 text-green-700 border-green-200",
  NETWORK: "bg-cyan-50 text-cyan-700 border-cyan-200",
  POWER: "bg-amber-50 text-amber-700 border-amber-200",
  PSU: "bg-amber-50 text-amber-700 border-amber-200",
  FAN: "bg-teal-50 text-teal-700 border-teal-200",
  ACCESSORY: "bg-slate-50 text-slate-600 border-slate-200",
  OTHER: "bg-slate-50 text-slate-600 border-slate-200",
};

function getComponentCategoryCode(asset: Asset) {
  return asset.product.category || asset.product.productCategory?.code || "OTHER";
}

function getComponentCategoryLabel(asset: Asset) {
  const code = getComponentCategoryCode(asset);
  return asset.product.categoryName || asset.product.productCategory?.name || COMPONENT_CATEGORY_LABELS[code] || code;
}

function groupComponentsByCategory(assets: Asset[]) {
  const grouped = assets.reduce((acc: Record<string, { label: string; items: Asset[] }>, asset) => {
    const code = getComponentCategoryCode(asset);
    if (!acc[code]) acc[code] = { label: getComponentCategoryLabel(asset), items: [] };
    acc[code].items.push(asset);
    return acc;
  }, {});

  return Object.entries(grouped).sort(([a], [b]) => {
    const aIndex = COMPONENT_CATEGORY_ORDER.indexOf(a);
    const bIndex = COMPONENT_CATEGORY_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
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

  // State cho Di chuyển linh kiện (hỗ trợ nhiều)
  const [moveComponents, setMoveComponents] = useState<Asset[]>([]);
  const [moveTargetId, setMoveTargetId] = useState<string>("");
  const [isMoving, setIsMoving] = useState(false);

  // State checkbox chọn linh kiện theo từng group
  const [selectedComponentIds, setSelectedComponentIds] = useState<Record<string, string[]>>({});

  // Warehouse list for filter dropdown
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);

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
      const [assetsRes, warehousesRes, categoriesRes] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/warehouses"),
        fetch("/api/product-categories"),
      ]);
      const assetsData = await assetsRes.json();
      setAllAssets(Array.isArray(assetsData) ? assetsData : []);
      const whData = await warehousesRes.json();
      setWarehouses(Array.isArray(whData) ? whData : []);
      const catData = await categoriesRes.json();
      setCategories(Array.isArray(catData) ? catData : catData.data || []);
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
    const currentComponentIds = allAssets
      .filter(asset => asset.parentId === parent.id)
      .map(asset => asset.id);
    setSelectedParent(parent);
    setComponentsToAttach(currentComponentIds);
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
  // HELPERS CHECKBOX SELECTION
  // =============================================
  const toggleComponent = (parentId: string, compId: string) => {
    setSelectedComponentIds(prev => {
      const cur = prev[parentId] || [];
      return {
        ...prev,
        [parentId]: cur.includes(compId) ? cur.filter(id => id !== compId) : [...cur, compId],
      };
    });
  };

  const toggleAllInGroup = (parentId: string, components: Asset[]) => {
    setSelectedComponentIds(prev => {
      const cur = prev[parentId] || [];
      const allSelected = cur.length === components.length;
      return { ...prev, [parentId]: allSelected ? [] : components.map(c => c.id) };
    });
  };

  const clearGroupSelection = (parentId: string) => {
    setSelectedComponentIds(prev => ({ ...prev, [parentId]: [] }));
  };

  // =============================================
  // HANDLERS LẮP / THÁO
  // =============================================
  const handleAttachBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParent) return toast.warning("Vui lòng chọn thiết bị mẹ");

    const currentComponentIds = allAssets
      .filter(asset => asset.parentId === selectedParent.id)
      .map(asset => asset.id);
    const availableComponentIds = availableComponents.map(asset => asset.id);
    const attachIds = componentsToAttach.filter(id => availableComponentIds.includes(id) && !currentComponentIds.includes(id));
    const detachIds = currentComponentIds.filter(id => !componentsToAttach.includes(id));

    if (attachIds.length === 0 && detachIds.length === 0) {
      return toast.warning("Cấu hình chưa có thay đổi");
    }

    setIsSubmitting(true);
    try {
      if (detachIds.length > 0) {
        const detachRes = await fetch("/api/assembly", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: 'DETACH_BULK', componentIds: detachIds }),
        });
        if (!detachRes.ok) throw new Error((await detachRes.json()).error);
      }

      if (attachIds.length > 0) {
        const attachRes = await fetch("/api/assembly", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: 'ATTACH_BULK', parentId: selectedParent.id, componentIds: attachIds }),
        });
        if (!attachRes.ok) throw new Error((await attachRes.json()).error);
      }

      toast.success(`Đã cập nhật cấu hình: lắp thêm ${attachIds.length}, tháo ${detachIds.length}.`);
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
      setSelectedComponentIds({});
      fetchData();
    } catch (error: any) { toast.error(error.message); }
    finally { setIsSubmitting(false); }
  };

  // =============================================
  // LỌC VÀ NHÓM DỮ LIỆU
  // =============================================
  const [parentSearch, setParentSearch] = useState("");
  const [configSearch, setConfigSearch] = useState("");

  const parentAssets = useMemo(() => {
    const servers = allAssets.filter(a => a.product.productCategory?.isMain === true);
    if (!parentSearch.trim()) return servers;
    const q = parentSearch.toLowerCase();
    return servers.filter(a =>
      a.serialNumber.toLowerCase().includes(q) ||
      a.product.name.toLowerCase().includes(q) ||
      (a.owner?.toLowerCase().includes(q) ?? false)
    );
  }, [allAssets, parentSearch]);

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

  const selectedParentCurrentComponents = useMemo(() => {
    if (!selectedParent) return [];
    return allAssets.filter(asset => asset.parentId === selectedParent.id);
  }, [allAssets, selectedParent]);

  const currentComponentIds = useMemo(
    () => selectedParentCurrentComponents.map(asset => asset.id),
    [selectedParentCurrentComponents]
  );

  const availableComponentIds = useMemo(
    () => availableComponents.map(asset => asset.id),
    [availableComponents]
  );

  const selectedAvailableComponents = useMemo(
    () => availableComponents.filter(asset => componentsToAttach.includes(asset.id)),
    [availableComponents, componentsToAttach]
  );

  const selectedModalComponents = useMemo(() => {
    const byId = new Map<string, Asset>();
    for (const asset of selectedParentCurrentComponents) byId.set(asset.id, asset);
    for (const asset of selectedAvailableComponents) byId.set(asset.id, asset);
    return Array.from(byId.values());
  }, [selectedParentCurrentComponents, selectedAvailableComponents]);

  const attachCount = componentsToAttach.filter(id => availableComponentIds.includes(id) && !currentComponentIds.includes(id)).length;
  const detachCount = currentComponentIds.filter(id => !componentsToAttach.includes(id)).length;
  const hasAssemblyChanges = attachCount > 0 || detachCount > 0;
  const allVisibleAvailableSelected = availableComponentIds.length > 0 && availableComponentIds.every(id => componentsToAttach.includes(id));

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
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2"><Server className="text-slate-500" /> Thiết bị lắp ráp</h2>
            <span className="text-xs text-slate-400">{parentAssets.length} thiết bị</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Tìm theo tên, Serial Number, chủ sở hữu..."
              value={parentSearch}
              onChange={e => setParentSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/70"><TableRow><TableHead>Thiết bị</TableHead><TableHead className="w-32 text-right">Hành động</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={2} className="text-center h-24">Đang tải...</TableCell></TableRow>
                  : parentAssets.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center h-24 text-slate-400">
                      {parentSearch ? `Không tìm thấy "${parentSearch}"` : "Không có thiết bị nguyên chiếc nào."}
                    </TableCell></TableRow>
                  ) : parentAssets.map(asset => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <p className="font-bold">{asset.product.name}</p>
                        <p className="font-mono text-xs text-slate-500">{asset.serialNumber}</p>
                        {asset.owner && <p className="text-xs text-slate-400 mt-0.5">{asset.owner}</p>}
                      </TableCell>
                      <TableCell className="text-right"><Button size="sm" onClick={() => handleOpenAssembleModal(asset)}><LinkIcon className="w-4 h-4 mr-2" /> Lắp ráp</Button></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* CỘT PHẢI: ACCORDION GROUPED COMPONENTS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2"><Cpu className="text-slate-500" /> Cấu hình thiết bị hiện tại</h2>
            <span className="text-xs text-slate-400">
              {Object.values(groupedAttachedComponents).filter(({ parentDetails, components }) => {
                if (!configSearch.trim()) return true;
                const q = configSearch.toLowerCase();
                return parentDetails.product.name.toLowerCase().includes(q) ||
                  parentDetails.serialNumber.toLowerCase().includes(q) ||
                  components.some(c => c.product.name.toLowerCase().includes(q) || c.serialNumber.toLowerCase().includes(q));
              }).length} thiết bị
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Tìm theo tên server, Serial, hoặc tên linh kiện..."
              value={configSearch}
              onChange={e => setConfigSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Accordion type="multiple" className="w-full space-y-3">
            {(() => {
              const filtered = Object.values(groupedAttachedComponents).filter(({ parentDetails, components }) => {
                if (!configSearch.trim()) return true;
                const q = configSearch.toLowerCase();
                return parentDetails.product.name.toLowerCase().includes(q) ||
                  parentDetails.serialNumber.toLowerCase().includes(q) ||
                  components.some(c => c.product.name.toLowerCase().includes(q) || c.serialNumber.toLowerCase().includes(q));
              });
              if (!loading && filtered.length === 0) {
                return <p className="text-slate-400 italic text-sm text-center pt-10">
                  {configSearch ? `Không tìm thấy "${configSearch}"` : "Chưa có thiết bị nào được lắp ráp linh kiện."}
                </p>;
              }
              return null;
            })()}
            {Object.values(groupedAttachedComponents).filter(({ parentDetails, components }) => {
              if (!configSearch.trim()) return true;
              const q = configSearch.toLowerCase();
              return parentDetails.product.name.toLowerCase().includes(q) ||
                parentDetails.serialNumber.toLowerCase().includes(q) ||
                components.some(c => c.product.name.toLowerCase().includes(q) || c.serialNumber.toLowerCase().includes(q));
            }).map(({ parentDetails, components }) => (
              <AccordionItem key={parentDetails.id} value={parentDetails.id} className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-slate-50/70 font-bold text-base">
                  <div className="flex flex-col items-start text-left">
                    <span>{parentDetails.product.name}</span>
                    <span className="font-mono text-xs text-slate-500">{parentDetails.serialNumber}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-slate-50/50 border-t">
                  {(() => {
                    const groupSel = selectedComponentIds[parentDetails.id] || [];
                    const allSelected = groupSel.length === components.length && components.length > 0;
                    const someSelected = groupSel.length > 0;
                    const selectedComps = components.filter(c => groupSel.includes(c.id));
                    return (
                      <div className="space-y-3">
                        {/* Header: chọn tất cả */}
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-500 select-none">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => toggleAllInGroup(parentDetails.id, components)}
                            />
                            {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                          </label>
                          {someSelected && (
                            <span className="text-xs text-blue-600 font-semibold">Đã chọn {groupSel.length}/{components.length}</span>
                          )}
                        </div>

                        {/* Danh sách linh kiện nhóm theo category */}
                        {(() => {
                          return groupComponentsByCategory(components).map(([cat, group]) => {
                            const catComps = group.items;
                            const catIds = catComps.map(c => c.id);
                            const allCatChecked = catIds.every(id => groupSel.includes(id));
                            const someCatChecked = catIds.some(id => groupSel.includes(id));
                            const toggleCat = () => {
                              setSelectedComponentIds(prev => {
                                const cur = prev[parentDetails.id] || [];
                                if (allCatChecked) return { ...prev, [parentDetails.id]: cur.filter(id => !catIds.includes(id)) };
                                return { ...prev, [parentDetails.id]: [...new Set([...cur, ...catIds])] };
                              });
                            };
                            return (
                              <div key={cat} className="space-y-1.5">
                                <div className={`flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-bold cursor-pointer select-none ${COMPONENT_CATEGORY_STYLES[cat] || COMPONENT_CATEGORY_STYLES.OTHER}`} onClick={toggleCat}>
                                  <Checkbox
                                    checked={allCatChecked}
                                    data-state={someCatChecked && !allCatChecked ? "indeterminate" : undefined}
                                    onCheckedChange={toggleCat}
                                    onClick={e => e.stopPropagation()}
                                    className="border-current data-[state=indeterminate]:bg-current/30"
                                  />
                                  <span>{group.label}</span>
                                  <span className="ml-auto opacity-60">{catComps.length}</span>
                                </div>
                                {catComps.map(comp => {
                                  const isChecked = groupSel.includes(comp.id);
                                  return (
                                    <div key={comp.id} className={`flex justify-between items-center p-2 rounded-md border transition-all ml-1 ${isChecked ? "bg-blue-50 border-blue-200" : "bg-white"}`}>
                                      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                        <Checkbox
                                          checked={isChecked}
                                          onCheckedChange={() => toggleComponent(parentDetails.id, comp.id)}
                                        />
                                        <div className="min-w-0">
                                          <p className="font-semibold text-sm truncate">{comp.product.name}</p>
                                          <p className="font-mono text-[11px] text-slate-500">{comp.serialNumber}</p>
                                        </div>
                                      </label>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <Button size="xs" variant="ghost" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => { setMoveComponents([comp]); setMoveTargetId(""); }}><ArrowRightLeft className="w-3 h-3 mr-1" /> Di chuyển</Button>
                                        <Button size="xs" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDetachmentInfo({ components: [comp] })}><Unlink className="w-3 h-3 mr-1.5" /> Tháo</Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          });
                        })()}

                        {/* Bulk action bar khi có selection */}
                        {someSelected && (
                          <div className="flex items-center gap-2 pt-2 border-t border-blue-200 mt-2">
                            <span className="text-xs text-slate-500 flex-1">{groupSel.length} linh kiện được chọn</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              onClick={() => { setMoveComponents(selectedComps); setMoveTargetId(""); }}
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> Di chuyển ({groupSel.length})
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => { setDetachmentInfo({ components: selectedComps }); clearGroupSelection(parentDetails.id); }}
                            >
                              <Unlink className="w-3.5 h-3.5 mr-1.5" /> Tháo ({groupSel.length})
                            </Button>
                          </div>
                        )}

                        {/* Tháo tất cả */}
                        <Button size="sm" variant="destructive" className="w-full mt-1 opacity-70 hover:opacity-100" onClick={() => setDetachmentInfo({ components })}>
                          <Trash2 className="w-4 h-4 mr-2" /> Tháo rời toàn bộ ({components.length} linh kiện)
                        </Button>
                      </div>
                    );
                  })()}
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
        <DialogContent className="bg-white md:max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="text-xl">Lắp linh kiện vào: {selectedParent?.serialNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAttachBulk} className="flex flex-col flex-1 min-h-0">

            {/* FILTER TOOLBAR */}
            <div className="flex flex-col gap-3 p-3 mx-6 mt-4 bg-slate-50 border border-slate-200 rounded-lg mb-3 shrink-0">
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
                    {categories.filter(category => !category.isMain).map((category) => (
                      <SelectItem key={category.id} value={category.code}>
                        {category.name}
                      </SelectItem>
                    ))}
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
                    <Input
                      placeholder="Dung lượng..."
                      value={selCapacity}
                      onChange={e => setSelCapacity(e.target.value)}
                      className="w-[110px] h-9 shrink-0 bg-purple-50/50 border-purple-200 text-sm"
                    />
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
                    <Input
                      placeholder="Dung lượng..."
                      value={selCapacity}
                      onChange={e => setSelCapacity(e.target.value)}
                      className="w-[110px] h-9 shrink-0 bg-orange-50/50 border-orange-200 text-sm"
                    />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 flex-1 min-h-0">
              <div className="flex flex-col space-y-3 overflow-y-auto pr-3 md:border-r md:pr-6">
                {isModalLoading ? <div className="flex justify-center items-center h-24"><Loader2 className="animate-spin text-blue-600" /></div>
                  : availableComponents.length === 0 ? <p className="text-slate-500 italic text-center py-4">Không có linh kiện nào phù hợp bộ lọc.</p>
                    : <>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-medium">{availableComponents.length} linh kiện</span>
                        <Button type="button" variant="link" size="sm" onClick={() => {
                          if (allVisibleAvailableSelected) {
                            setComponentsToAttach(prev => prev.filter(id => !availableComponentIds.includes(id)));
                          } else {
                            setComponentsToAttach(prev => [...new Set([...prev, ...availableComponentIds])]);
                          }
                        }}><CheckSquare className="w-4 h-4 mr-2" /> {allVisibleAvailableSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</Button>
                      </div>
                      {groupComponentsByCategory(availableComponents).map(([categoryCode, group]) => (
                        <div key={categoryCode} className="space-y-1.5">
                          <div className={`flex items-center justify-between px-2 py-1 rounded-md border text-xs font-bold ${COMPONENT_CATEGORY_STYLES[categoryCode] || COMPONENT_CATEGORY_STYLES.OTHER}`}>
                            <span>{group.label}</span>
                            <span>{group.items.length}</span>
                          </div>
                          {group.items.map(comp => (
                            <div key={comp.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 border has-[:checked]:bg-blue-50 has-[:checked]:border-blue-200 transition-all">
                              <Checkbox
                                id={comp.id}
                                checked={componentsToAttach.includes(comp.id)}
                                onCheckedChange={(checked) => {
                                  setComponentsToAttach(prev => checked ? [...new Set([...prev, comp.id])] : prev.filter(id => id !== comp.id));
                                }}
                              />
                              <label htmlFor={comp.id} className="flex-1 cursor-pointer min-w-0">
                                <p className="font-semibold truncate">{comp.product.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-xs text-slate-500">{comp.serialNumber}</span>
                                  {comp.owner && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 rounded font-medium">{comp.owner}</span>}
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                      ))}
                    </>
                }
              </div>

              {/* RIGHT SIDE: SELECTED COMPONENTS */}
              <div className="flex flex-col overflow-y-auto pl-1 pr-2">
                <div className="pb-2 border-b mb-3">
                  <h3 className="font-bold text-slate-700">Linh kiện đã chọn ({selectedModalComponents.length})</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đang lắp: {selectedParentCurrentComponents.length} | Lắp thêm: {attachCount} | Sẽ tháo: {detachCount}
                  </p>
                </div>
                <div className="space-y-3">
                  {selectedModalComponents.length === 0 ? (
                    <p className="text-sm text-slate-500 italic text-center py-4">Chưa chọn linh kiện nào</p>
                  ) : (
                    groupComponentsByCategory(selectedModalComponents).map(([categoryCode, group]) => (
                      <div key={categoryCode} className="space-y-1.5">
                        <div className={`flex items-center justify-between px-2 py-1 rounded-md border text-xs font-bold ${COMPONENT_CATEGORY_STYLES[categoryCode] || COMPONENT_CATEGORY_STYLES.OTHER}`}>
                          <span>{group.label}</span>
                          <span>{group.items.length}</span>
                        </div>
                        {group.items.map(asset => (
                          <div key={asset.id} className="flex items-center gap-3 border border-blue-200 p-2.5 rounded-md bg-blue-50/50">
                            <Checkbox
                              checked={componentsToAttach.includes(asset.id)}
                              onCheckedChange={(checked) => {
                                setComponentsToAttach(prev => checked ? [...new Set([...prev, asset.id])] : prev.filter(id => id !== asset.id));
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate">{asset.product.name}</p>
                                <Badge
                                  variant="outline"
                                  className={
                                    currentComponentIds.includes(asset.id) && !componentsToAttach.includes(asset.id)
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : currentComponentIds.includes(asset.id)
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                        : "bg-green-50 text-green-700 border-green-200"
                                  }
                                >
                                  {currentComponentIds.includes(asset.id) && !componentsToAttach.includes(asset.id)
                                    ? "Sẽ tháo"
                                    : currentComponentIds.includes(asset.id)
                                      ? "Đang lắp"
                                      : "Mới chọn"}
                                </Badge>
                              </div>
                              <p className="font-mono text-xs text-slate-500">{asset.serialNumber}</p>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setComponentsToAttach(prev => prev.filter(id => id !== asset.id))} className="text-red-600 hover:text-red-700 hover:bg-red-100 h-8 px-3">Bỏ</Button>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t mt-2 shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsAssembleModalOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={isSubmitting || !hasAssemblyChanges} className="bg-blue-600 text-white">
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <LinkIcon className="mr-2" />} Cập nhật cấu hình
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DI CHUYỂN LINH KIỆN (hỗ trợ nhiều) */}
      <Dialog open={moveComponents.length > 0} onOpenChange={(open) => !open && setMoveComponents([])}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              Di chuyển {moveComponents.length > 1 ? `${moveComponents.length} linh kiện` : "linh kiện"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Danh sách linh kiện được chọn */}
            <div className="bg-slate-50 p-3 rounded-lg border space-y-2 max-h-40 overflow-y-auto">
              {moveComponents.map(comp => (
                <div key={comp.id}>
                  <p className="text-sm font-bold text-slate-700">{comp.product.name}</p>
                  <p className="font-mono text-xs text-slate-500">SN: {comp.serialNumber}</p>
                </div>
              ))}
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
                    .filter(a => moveComponents.every(c => c.parentId !== a.id))
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
            <Button type="button" variant="outline" onClick={() => setMoveComponents([])}>Hủy</Button>
            <Button
              type="button"
              disabled={!moveTargetId || isMoving}
              className="bg-blue-600 text-white"
              onClick={async () => {
                if (moveComponents.length === 0 || !moveTargetId) return;
                setIsMoving(true);
                try {
                  const res = await fetch("/api/assets/move-component", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ componentIds: moveComponents.map(c => c.id), targetAssetId: moveTargetId }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  toast.success(data.message);
                  setMoveComponents([]);
                  setSelectedComponentIds({});
                  fetchData();
                } catch (error: any) {
                  toast.error(error.message || "Lỗi di chuyển linh kiện");
                } finally {
                  setIsMoving(false);
                }
              }}
            >
              {isMoving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
              {isMoving ? "Đang xử lý..." : `Di chuyển${moveComponents.length > 1 ? ` (${moveComponents.length})` : ""}`}
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
