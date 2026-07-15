"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, BrainCircuit, Plus, Loader2, Save, X, Server, Layers } from "lucide-react";
import { handleApiResponse } from "@/lib/api-handler";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
  getGenerations,
  getStorageTypes,
  getStorageInterfaces,
  getCpuSeries
} from "@/lib/product-options";
import { componentSlotType, getSlotNames } from "@/lib/server-slots";

// Định nghĩa Interfaces
interface BasicItem { id: string; name: string; warehouseId?: string; type?: string; }
interface ProductItem {
  id: string;
  name: string;
  modelNumber: string;
  category: string;
  type: string;
  brand?: string;
  attributes?: Record<string, unknown> | null;
  productCategory?: { isMain?: boolean; code?: string };
}

interface CreateAssetProps {
  onRefresh: () => void;
}

type AiAssemblyResult = {
  compatible: boolean;
  confidence?: number;
  aiUnavailable?: boolean;
  aiMessage?: string;
  issues: { severity: "ERROR" | "WARNING"; message: string; source: "SYSTEM" | "HERMES" }[];
};

function RackUnitFields({ formData, setFormData, racksList, allowRackUnit }: {
  formData: any;
  setFormData: (v: any) => void;
  racksList: BasicItem[];
  allowRackUnit: boolean;
}) {
  const selectedRack = racksList.find(r => r.id === formData.rackId);
  const isStorage = selectedRack?.type === "STORAGE";

  return (
    <div className="grid grid-cols-3 gap-4 animate-in slide-in-from-top-2">
      <div className="col-span-2 space-y-2">
        <label className="text-sm font-medium text-slate-700">Tủ Rack</label>
        <Select value={formData.rackId} onValueChange={(v: string) => setFormData({ ...formData, rackId: v === "none" ? "" : v })}>
          <SelectTrigger className="bg-white"><SelectValue placeholder="Chọn Tủ" /></SelectTrigger>
          <SelectContent className="bg-white max-h-[200px]">
            <SelectItem value="none" className="text-slate-400 italic">-- Để ngoài --</SelectItem>
            {racksList.filter(r => r.warehouseId === formData.warehouseId).map((r: BasicItem) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {allowRackUnit && formData.rackId && !isStorage && (
        <div className="col-span-1 space-y-2">
          <label className="text-sm font-medium text-slate-700">Vị trí U</label>
          <Input
            type="number" min="1" max="48" placeholder="U?"
            value={formData.rackUnit}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              if (value === "" || Number(value) >= 1) setFormData({ ...formData, rackUnit: value });
            }}
            disabled={!formData.rackId}
            className="bg-white"
          />
        </div>
      )}

    </div>
  );
}

export function CreateAssetModal({ onRefresh }: CreateAssetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // States danh mục
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [typesList, setTypesList] = useState<string[]>([]);
  const [productsList, setProductsList] = useState<ProductItem[]>([]);
  const [warehousesList, setWarehousesList] = useState<BasicItem[]>([]);
  const [racksList, setRacksList] = useState<BasicItem[]>([]);
  const [parentsList, setParentsList] = useState<{ id: string; serialNumber: string; product: ProductItem }[]>([]);
  const [parentSearch, setParentSearch] = useState("");
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());
  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<AiAssemblyResult | null>(null);

  // States bộ lọc tầng
  const [selCategory, setSelCategory] = useState<string>("");
  const [selType, setSelType] = useState<string>("");

  // Dynamic States for Filters
  const [selGeneration, setSelGeneration] = useState<string>("");
  const [selCapacity, setSelCapacity] = useState<string>("");
  const [selAttrType, setSelAttrType] = useState<string>(""); // Used for storage Type
  const [selInterface, setSelInterface] = useState<string>("");
  const [selSeries, setSelSeries] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Form State
  const initialForm = {
    serialNumber: "",
    productId: "",
    warehouseId: "",
    rackId: "",
    rackUnit: "",
    uHeight: "1",
    status: "IN_STOCK",
    owner: "",
    notes: "",
    parentId: "",
    installSlotType: "",
    installSlotName: "",
  };
  const [formData, setFormData] = useState(initialForm);
  const selectedProduct = productsList.find(p => p.id === formData.productId);
  const selectedProductIsMain = selectedProduct?.productCategory?.isMain === true;
  const selectedProductIsComponent = selectedProduct?.productCategory?.isMain === false;
  const requiredSlotType = componentSlotType({ product: selectedProduct });
  const selectedParent = parentsList.find(p => p.id === formData.parentId);
  const slotOptions = selectedParent ? getSlotNames(selectedParent.product, requiredSlotType) : [];

  const safeJson = async (res: Response) => {
    if (!res.ok) return [];
    try {
      const json = await res.json();
      if (Array.isArray(json)) return json;
      if (json && Array.isArray(json.data)) return json.data;
      return [];
    } catch (e) {
      return [];
    }
  };

  // 1. Fetch Categories ban đầu
  const fetchCascadingData = async () => {
    setIsLoadingData(true);
    try {
      const [catRes, wareRes, rackRes, parentsRes] = await Promise.all([
        fetch("/api/products/taxonomy?field=category"),
        fetch("/api/warehouses"),
        fetch("/api/racks"),
        fetch("/api/assets?tabFilter=main&pageSize=100&page=1")
      ]);
      setCategoriesList(await safeJson(catRes));
      setWarehousesList(await safeJson(wareRes));
      setRacksList(await safeJson(rackRes));
      const pd = await parentsRes.json();
      setParentsList(Array.isArray(pd) ? pd : pd.data || []);
    } catch (e) { toast.error("Lỗi kết nối."); }
    finally { setIsLoadingData(false); }
  };

  // 2. Tải Types khi Category thay đổi
  const onCategoryChange = async (category: string) => {
    setSelCategory(category);
    setSelType("");
    setSelGeneration(""); setSelCapacity(""); setSelAttrType(""); setSelInterface(""); setSelSeries(""); setSearchQuery("");
    setFormData({ ...formData, productId: "" });
    setTypesList([]); setProductsList([]);
    if (!category) return;

    try {
      const res = await fetch(`/api/products/taxonomy?field=type&category=${category}`);
      setTypesList(await safeJson(res));
    } catch (e) { console.error(e); }
  };

  const onTypeChange = (type: string) => {
    setSelType(type === "none" ? "" : type);
    setFormData({ ...formData, productId: "" });
  };

  React.useEffect(() => {
    if (!selCategory) return;

    const loadProducts = async () => {
      try {
        setIsLoadingData(true);
        const params = new URLSearchParams();
        params.append("category", selCategory);

        if (selType && selType !== "none") params.append("type", selType);
        if (selCategory === "MEMORY" && selGeneration && selGeneration !== "none") params.append("generation", selGeneration);
        if (selCategory === "MEMORY" && selCapacity && selCapacity !== "none") params.append("capacity", selCapacity);

        if (selCategory === "STORAGE") {
          if (selAttrType && selAttrType !== "none") params.append("attrType", selAttrType);
          if (selCapacity && selCapacity !== "none") params.append("capacity", selCapacity);
          if (selInterface && selInterface !== "none") params.append("interface", selInterface);
        }

        if (selCategory === "CPU" && selSeries && selSeries !== "none") params.append("series", selSeries);
        if (searchQuery) params.append("search", searchQuery);

        params.append("take", "20");

        const res = await fetch(`/api/products?${params.toString()}`);
        setProductsList(await safeJson(res));
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingData(false);
      }
    };

    const timer = setTimeout(() => {
      loadProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [selCategory, selType, selGeneration, selCapacity, selAttrType, selInterface, selSeries, searchQuery]);

  React.useEffect(() => {
    if (!formData.parentId || !requiredSlotType) {
      setOccupiedSlots(new Set());
      return;
    }

    const loadOccupiedSlots = async () => {
      try {
        const res = await fetch(`/api/assets?parentId=${formData.parentId}`);
        const json = await res.json();
        const children = Array.isArray(json) ? json : json.data || [];
        setOccupiedSlots(new Set(
          children
            .filter((item: any) => item.installSlotType && item.installSlotName)
            .map((item: any) => `${item.installSlotType}:${item.installSlotName}`)
        ));
      } catch {
        setOccupiedSlots(new Set());
      }
    };

    loadOccupiedSlots();
  }, [formData.parentId, requiredSlotType]);

  React.useEffect(() => {
    if (!formData.parentId || !selectedProductIsComponent || !selectedProduct?.id) {
      setAiResult(null);
      setAiChecking(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setAiChecking(true);
      try {
        const res = await fetch("/api/ai/assembly/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentId: formData.parentId,
            componentProductIds: [selectedProduct.id],
          }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || "Lỗi kiểm tra AI");
        setAiResult({
          compatible: json.compatible !== false,
          confidence: json.confidence,
          aiUnavailable: json.aiUnavailable,
          aiMessage: json.aiMessage,
          issues: Array.isArray(json.issues) ? json.issues : [],
        });
      } catch (error: any) {
        if (!cancelled) {
          setAiResult({
            compatible: true,
            aiUnavailable: true,
            aiMessage: error.message || "Không thể kiểm tra AI.",
            issues: [],
          });
        }
      } finally {
        if (!cancelled) setAiChecking(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.parentId, selectedProductIsComponent, selectedProduct?.id]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setFormData(initialForm);
      setSelCategory(""); setSelType("");
      setSelGeneration(""); setSelCapacity(""); setSelAttrType(""); setSelInterface(""); setSelSeries(""); setSearchQuery("");
      setTypesList([]); setProductsList([]);
      setParentSearch("");
      fetchCascadingData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serialNumber || !formData.productId || !formData.warehouseId) {
      toast.error("Vui lòng điền đầy đủ Mã SN, Sản phẩm và Kho hàng!");
      return;
    }
    if (formData.parentId && requiredSlotType && !formData.installSlotName) {
      toast.error(`Vui lòng chọn ${requiredSlotType === "DIMM" ? "DIMM slot" : "Bay ổ cứng"} khi lắp linh kiện vào server.`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...formData, uHeight: undefined };
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          rackUnit: selectedProductIsMain && formData.rackUnit ? parseInt(formData.rackUnit) : null,
        }),
      });

      await handleApiResponse(res, "Đã nhập kho thiết bị thành công!");

      setIsOpen(false);
      onRefresh();

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
          <Plus className="w-4 h-4 mr-2" />Thêm Thiết bị
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-white sm:max-w-[600px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-slate-50">
          <DialogTitle className="flex items-center gap-2 text-xl text-slate-800">
            <Server className="w-5 h-5 text-blue-600" /> Nhập thiết bị mới
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">

            {isLoadingData && (
              <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            )}

            <div className="bg-slate-50 border p-4 rounded-lg space-y-4">
              <p className="text-sm font-bold text-slate-700">1. Chọn Sản phẩm <span className="text-red-500">*</span></p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Danh mục</label>
                  <Select value={selCategory} onValueChange={onCategoryChange}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                    <SelectContent>
                      {categoriesList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Phân loại phụ (Type)</label>
                  <Select value={selType} onValueChange={onTypeChange} disabled={!selCategory || typesList.length === 0}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Đang lọc..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Hủy lọc --</SelectItem>
                      {typesList.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* DYNAMIC FILTERS */}
              {selCategory === "MEMORY" && (
                <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded border border-blue-100 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                      <span>Generation</span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">Bộ nhớ</span>
                    </label>
                    <Select value={selGeneration} onValueChange={setSelGeneration}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Hủy lọc --</SelectItem>
                        {getGenerations().map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Capacity</label>
                    <Input
                      placeholder="VD: 32GB, 64GB..."
                      className="bg-white"
                      value={selCapacity}
                      onChange={e => setSelCapacity(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {selCategory === "STORAGE" && (
                <div className="grid grid-cols-3 gap-3 bg-emerald-50/50 p-3 rounded border border-emerald-100 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Loại Ổ Cứng</label>
                    <Select value={selAttrType} onValueChange={setSelAttrType}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Hủy lọc --</SelectItem>
                        {getStorageTypes().map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Dung lượng</label>
                    <Input
                      placeholder="VD: 1.92TB, 4TB..."
                      className="bg-white"
                      value={selCapacity}
                      onChange={e => setSelCapacity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Giao tiếp</label>
                    <Select value={selInterface} onValueChange={setSelInterface}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Hủy lọc --</SelectItem>
                        {getStorageInterfaces().map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selCategory === "CPU" && (
                <div className="grid grid-cols-1 gap-3 bg-purple-50/50 p-3 rounded border border-purple-100 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">CPU Series</label>
                    <Select value={selSeries} onValueChange={setSelSeries}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Hủy lọc --</SelectItem>
                        {getCpuSeries().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* TÌM KIẾM VÀ CHỌN SẢN PHẨM */}
              <div className="grid grid-cols-1 mt-3 gap-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Tìm kiếm: Tên, Model, Nhà cung cấp (Vendor)..."
                    className="bg-white shadow-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase text-blue-700">Chính xác Sản phẩm</label>
                  <Select
                    required
                    value={formData.productId}
                    onValueChange={(v) => {
                      const product = productsList.find(p => p.id === v);
                      const isMain = product?.productCategory?.isMain === true;
                      setFormData({
                        ...formData,
                        productId: v,
                        parentId: isMain ? "" : formData.parentId,
                        installSlotType: "",
                        installSlotName: "",
                        status: isMain && formData.status === "INSTALLED" ? "IN_STOCK" : formData.status,
                      });
                    }}
                    disabled={productsList.length === 0}
                  >
                    <SelectTrigger className="bg-white border-blue-200 ring-1 ring-blue-100"><SelectValue placeholder={productsList.length > 0 ? "Chọn sản phẩm" : "Vui lòng nhập tìm kiếm hoặc lọc..."} /></SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {productsList.length > 0 ? (
                        productsList.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex flex-col text-left py-1">
                              <span className="font-medium text-slate-800">{p.name} <span className="text-slate-400 font-mono text-xs ml-1">[{p.modelNumber}]</span></span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="empty" disabled>Không có sản phẩm</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product Preview Card */}
              {formData.productId && (
                (() => {
                  const p = productsList.find(x => x.id === formData.productId);
                  if (!p) return null;
                  return (
                    <div className="mt-3 bg-white p-3 rounded-md border border-slate-200/60 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase shrink-0">
                          {p.brand?.[0] || p.category?.[0] || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm leading-tight">{p.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {p.brand && <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{p.brand}</span>}
                            {p.type && <span className="text-xs text-slate-500">{p.type}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">2. Mã thiết bị (Serial Number) <span className="text-red-500">*</span></label>
                <Input
                  autoFocus
                  required
                  placeholder="Nhập SN..."
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value.toUpperCase() })}
                  className="font-mono uppercase bg-yellow-50/50 border-yellow-200 focus-visible:ring-yellow-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Trạng thái (Status)</label>
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
                  <SelectTrigger className="bg-white"><SelectValue placeholder="IN_STOCK" /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="IN_STOCK">Trong kho (IN_STOCK)</SelectItem>
                    <SelectItem value="DEPLOYED">Lắp đặt ngay (DEPLOYED)</SelectItem>
                    <SelectItem value="INSTALLED" disabled>Đã lắp trong server (tự động khi chọn thiết bị cha)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Chủ sở hữu (Owner)</label>
              <Input
                placeholder="VD: DevOps Team / Nguyễn Văn A"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="bg-white"
              />
            </div>

            {selectedProductIsComponent && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500" /> Thiết bị cha <span className="text-xs text-slate-400 font-normal">(lắp ngay vào server)</span>
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
                    parentId: v === "none" ? "" : v,
                    installSlotType: "",
                    installSlotName: "",
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
                          (p.product?.name || "").toLowerCase().includes(q);
                      })
                      .map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="font-mono text-xs text-blue-600 mr-2">{p.serialNumber}</span>
                          <span className="text-slate-700">{p.product?.name}</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {formData.parentId && formData.parentId !== "none" && (() => {
                  const p = parentsList.find(x => x.id === formData.parentId);
                  return p ? (
                    <p className="text-xs text-blue-600">
                      ✓ Sẽ lắp vào: <strong>{p.serialNumber}</strong> — {p.product?.name}
                    </p>
                  ) : null;
                })()}
                {(aiChecking || aiResult) && (
                  <div className={`rounded-md border px-3 py-2 text-sm ${
                    aiChecking
                      ? "border-blue-200 bg-blue-50 text-blue-800"
                      : aiResult?.aiUnavailable
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : aiResult?.compatible
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-red-200 bg-red-50 text-red-800"
                  }`}>
                    <div className="flex items-start gap-2">
                      {aiChecking ? <Loader2 className="mt-0.5 h-4 w-4 animate-spin" /> : aiResult?.compatible ? <BrainCircuit className="mt-0.5 h-4 w-4" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {aiChecking
                            ? "AI đang kiểm tra tương thích..."
                            : aiResult?.aiUnavailable
                              ? "AI chưa phản hồi, dùng rule hệ thống"
                              : aiResult?.compatible
                                ? "AI tư vấn: phù hợp với server"
                                : "AI tư vấn: không phù hợp với server"}
                          {typeof aiResult?.confidence === "number" ? ` (${Math.round(aiResult.confidence * 100)}%)` : ""}
                        </p>
                        {aiResult?.aiMessage && <p className="mt-1 text-xs">{aiResult.aiMessage}</p>}
                        {aiResult?.issues?.slice(0, 3).map((issue, index) => (
                          <p key={index} className="mt-1 text-xs">
                            {issue.source === "SYSTEM" ? "Rule" : "Hermes"}: {issue.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {formData.parentId && requiredSlotType && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border border-indigo-100 bg-indigo-50/60 p-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">{requiredSlotType === "DIMM" ? "DIMM slot" : "Bay ổ cứng"}</label>
                      <Select
                        value={formData.installSlotName}
                        onValueChange={(slotName) => setFormData({
                          ...formData,
                          installSlotType: requiredSlotType,
                          installSlotName: slotName,
                        })}
                      >
                        <SelectTrigger className="bg-white"><SelectValue placeholder={`Chọn ${requiredSlotType === "DIMM" ? "DIMM" : "Bay"}`} /></SelectTrigger>
                        <SelectContent className="bg-white">
                          {slotOptions.map(slotName => {
                            const used = occupiedSlots.has(`${requiredSlotType}:${slotName}`);
                            return (
                              <SelectItem key={slotName} value={slotName} disabled={used}>
                                {slotName}{used ? " - Đã dùng" : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <p className="text-xs text-indigo-700">
                        RAM/ổ cứng cần chọn đúng vị trí để hoàn thiện dữ liệu DIMM/Bay.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 border p-4 rounded-lg bg-slate-50/50">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Kho hàng (Warehouse) *</label>
                <Select required value={formData.warehouseId} onValueChange={(v) => setFormData({ ...formData, warehouseId: v, rackId: "", rackUnit: "" })}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Chọn kho" /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {warehousesList.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {formData.warehouseId && (
                <RackUnitFields
                  formData={formData}
                  setFormData={setFormData}
                  racksList={racksList}
                  allowRackUnit={selectedProductIsMain}
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Ghi chú (Tùy chọn)</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ghi chú..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" /> Hủy
            </Button>
            <Button type="submit" disabled={isSaving || isLoadingData} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {isSaving ? "Đang xử lý..." : "Nhập Kho Ngay"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
