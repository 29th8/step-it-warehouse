"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckSquare, Cpu, Filter, Link as LinkIcon, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductCategoryOption } from "@/components/products/product-category-manager";

type Product = {
  id: string;
  name: string;
  category?: string;
  categoryName?: string;
  productCategory?: ProductCategoryOption;
};

type Warehouse = { id: string; name: string };

export type AssemblyAsset = {
  id: string;
  serialNumber: string;
  product: Product;
  warehouse?: Warehouse;
  owner?: string | null;
  parentId?: string | null;
  parent?: AssemblyAsset | null;
};

type AssemblyConfigDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentAsset: AssemblyAsset | null;
  onSaved?: () => void;
};

const CATEGORY_ORDER = ["CPU", "MEMORY", "STORAGE", "GPU", "NETWORK", "MODULE", "POWER", "PSU", "FAN", "ACCESSORY"];
const CATEGORY_STYLES: Record<string, string> = {
  CPU: "bg-blue-50 text-blue-700 border-blue-200",
  MEMORY: "bg-purple-50 text-purple-700 border-purple-200",
  STORAGE: "bg-orange-50 text-orange-700 border-orange-200",
  GPU: "bg-green-50 text-green-700 border-green-200",
  NETWORK: "bg-cyan-50 text-cyan-700 border-cyan-200",
  MODULE: "bg-sky-50 text-sky-700 border-sky-200",
  POWER: "bg-amber-50 text-amber-700 border-amber-200",
  PSU: "bg-amber-50 text-amber-700 border-amber-200",
  FAN: "bg-teal-50 text-teal-700 border-teal-200",
  ACCESSORY: "bg-slate-50 text-slate-600 border-slate-200",
  OTHER: "bg-slate-50 text-slate-600 border-slate-200",
};

function categoryCode(asset: AssemblyAsset) {
  return asset.product.category || asset.product.productCategory?.code || "OTHER";
}

function categoryLabel(asset: AssemblyAsset) {
  const code = categoryCode(asset);
  return asset.product.categoryName || asset.product.productCategory?.name || code;
}

function groupByCategory(assets: AssemblyAsset[]) {
  const grouped = assets.reduce((acc: Record<string, { label: string; items: AssemblyAsset[] }>, asset) => {
    const code = categoryCode(asset);
    if (!acc[code]) acc[code] = { label: categoryLabel(asset), items: [] };
    acc[code].items.push(asset);
    return acc;
  }, {});

  return Object.entries(grouped).sort(([a], [b]) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function AssemblyConfigDialog({ open, onOpenChange, parentAsset, onSaved }: AssemblyConfigDialogProps) {
  const [allAssets, setAllAssets] = useState<AssemblyAsset[]>([]);
  const [availableComponents, setAvailableComponents] = useState<AssemblyAsset[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [warehouseId, setWarehouseId] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentComponents = useMemo(() => {
    if (!parentAsset) return [];
    return allAssets.filter((asset) => asset.parentId === parentAsset.id);
  }, [allAssets, parentAsset]);

  const currentIds = useMemo(() => currentComponents.map((asset) => asset.id), [currentComponents]);
  const availableIds = useMemo(() => availableComponents.map((asset) => asset.id), [availableComponents]);
  const attachIds = selectedIds.filter((id) => availableIds.includes(id) && !currentIds.includes(id));
  const detachIds = currentIds.filter((id) => !selectedIds.includes(id));
  const hasChanges = attachIds.length > 0 || detachIds.length > 0;

  const selectedComponents = useMemo(() => {
    const map = new Map<string, AssemblyAsset>();
    for (const asset of currentComponents) map.set(asset.id, asset);
    for (const asset of availableComponents) {
      if (selectedIds.includes(asset.id)) map.set(asset.id, asset);
    }
    return Array.from(map.values());
  }, [currentComponents, availableComponents, selectedIds]);

  const allVisibleAvailableSelected = availableIds.length > 0 && availableIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    if (!open || !parentAsset) return;
    setSearch("");
    setCategory("ALL");
    setWarehouseId("ALL");
    fetchInitialData(parentAsset.id);
  }, [open, parentAsset?.id]);

  useEffect(() => {
    if (!open || !parentAsset) return;
    const timer = setTimeout(() => fetchAvailableComponents(), 300);
    return () => clearTimeout(timer);
  }, [open, parentAsset?.id, search, category, warehouseId]);

  const parseList = async (res: Response) => {
    const json = await res.json().catch(() => null);
    return Array.isArray(json) ? json : json?.data || [];
  };

  const fetchInitialData = async (parentId: string) => {
    setLoading(true);
    try {
      const [assetsRes, warehousesRes, categoriesRes] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/warehouses"),
        fetch("/api/product-categories"),
      ]);
      const assets = await parseList(assetsRes);
      setAllAssets(assets);
      setWarehouses(await parseList(warehousesRes));
      setCategories(await parseList(categoriesRes));
      setSelectedIds(assets.filter((asset: AssemblyAsset) => asset.parentId === parentId).map((asset: AssemblyAsset) => asset.id));
      await fetchAvailableComponents();
    } catch (error) {
      toast.error("Lỗi tải dữ liệu lắp ráp");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableComponents = async () => {
    try {
      const params = new URLSearchParams();
      params.append("component", "true");
      params.append("take", "100");
      if (search) params.append("search", search);
      if (category !== "ALL") params.append("category", category);
      if (warehouseId !== "ALL") params.append("warehouseId", warehouseId);

      const res = await fetch(`/api/assets?${params.toString()}`);
      setAvailableComponents(await parseList(res));
    } catch (error) {
      setAvailableComponents([]);
      toast.error("Lỗi tải linh kiện rời");
    }
  };

  const toggleId = (id: string, checked: boolean) => {
    setSelectedIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id));
  };

  const handleSave = async () => {
    if (!parentAsset || !hasChanges) return;
    setSaving(true);
    try {
      if (detachIds.length > 0) {
        const res = await fetch("/api/assembly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "DETACH_BULK", componentIds: detachIds }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Không thể tháo linh kiện");
      }

      if (attachIds.length > 0) {
        const res = await fetch("/api/assembly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "ATTACH_BULK", parentId: parentAsset.id, componentIds: attachIds }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Không thể lắp linh kiện");
      }

      toast.success(`Đã cập nhật cấu hình: lắp thêm ${attachIds.length}, tháo ${detachIds.length}.`);
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi cập nhật cấu hình");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white !w-[96vw] !max-w-none h-[88vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50">
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            Lắp ráp: {parentAsset?.serialNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 border-b bg-white space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm serial hoặc tên linh kiện rời..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              Lọc:
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả linh kiện</SelectItem>
                {categories.filter((item) => !item.isMain).map((item) => (
                  <SelectItem key={item.id} value={item.code}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="w-[180px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả kho</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 py-4 flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto pr-2 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : availableComponents.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-8">Không có linh kiện rời phù hợp.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{availableComponents.length} linh kiện rời</span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setSelectedIds((prev) => allVisibleAvailableSelected
                        ? prev.filter((id) => !availableIds.includes(id))
                        : [...new Set([...prev, ...availableIds])]
                      );
                    }}
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    {allVisibleAvailableSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </Button>
                </div>
                {groupByCategory(availableComponents).map(([code, group]) => (
                  <div key={code} className="space-y-1.5">
                    <div className={`flex items-center justify-between px-2 py-1 rounded-md border text-xs font-bold ${CATEGORY_STYLES[code] || CATEGORY_STYLES.OTHER}`}>
                      <span>{group.label}</span>
                      <span>{group.items.length}</span>
                    </div>
                    {group.items.map((component) => (
                      <label key={component.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-200 cursor-pointer">
                        <Checkbox
                          checked={selectedIds.includes(component.id)}
                          onCheckedChange={(checked) => toggleId(component.id, Boolean(checked))}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{component.product.name}</p>
                          <p className="font-mono text-xs text-slate-500">{component.serialNumber}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="overflow-y-auto pl-1 pr-2 space-y-3">
            <div className="pb-2 border-b">
              <h3 className="font-bold text-slate-700">Cấu hình đang chọn ({selectedComponents.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Đang lắp: {currentComponents.length} | Lắp thêm: {attachIds.length} | Sẽ tháo: {detachIds.length}
              </p>
            </div>
            {selectedComponents.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-8">Chưa có linh kiện nào.</p>
            ) : (
              groupByCategory(selectedComponents).map(([code, group]) => (
                <div key={code} className="space-y-1.5">
                  <div className={`flex items-center justify-between px-2 py-1 rounded-md border text-xs font-bold ${CATEGORY_STYLES[code] || CATEGORY_STYLES.OTHER}`}>
                    <span>{group.label}</span>
                    <span>{group.items.length}</span>
                  </div>
                  {group.items.map((component) => {
                    const isCurrent = currentIds.includes(component.id);
                    const willDetach = isCurrent && !selectedIds.includes(component.id);
                    return (
                      <div key={component.id} className={`flex items-center gap-3 border p-2.5 rounded-md ${willDetach ? "bg-red-50/60 border-red-200" : "bg-blue-50/50 border-blue-200"}`}>
                        <Checkbox
                          checked={selectedIds.includes(component.id)}
                          onCheckedChange={(checked) => toggleId(component.id, Boolean(checked))}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{component.product.name}</p>
                            <Badge variant="outline" className={willDetach ? "bg-red-50 text-red-700 border-red-200" : isCurrent ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-green-50 text-green-700 border-green-200"}>
                              {willDetach ? "Sẽ tháo" : isCurrent ? "Đang lắp" : "Mới chọn"}
                            </Badge>
                          </div>
                          <p className="font-mono text-xs text-slate-500">{component.serialNumber}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button type="button" disabled={!hasChanges || saving} onClick={handleSave} className="bg-blue-600 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
            Cập nhật cấu hình
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
