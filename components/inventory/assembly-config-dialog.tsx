"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, BrainCircuit, CheckSquare, Cpu, Filter, Link as LinkIcon, Loader2, Search, Unlink, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductCategoryOption } from "@/components/products/product-category-manager";
import type { ProductAttributeDefinition } from "@/components/products/product-attribute-fields";
import { componentSlotType, getSlotNames, isServerProduct, type SlotType } from "@/lib/server-slots";

type Product = {
  id: string;
  name: string;
  category?: string;
  categoryName?: string;
  attributes?: Record<string, unknown> | null;
  productCategory?: ProductCategoryOption;
};

type Warehouse = { id: string; name: string };

export type AssemblyAsset = {
  id: string;
  serialNumber: string;
  status?: string | null;
  product: Product;
  warehouse?: Warehouse;
  owner?: string | null;
  parentId?: string | null;
  parent?: AssemblyAsset | null;
  installSlotType?: string | null;
  installSlotName?: string | null;
};

type AssemblyConfigDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentAsset: AssemblyAsset | null;
  onSaved?: () => void;
};

type AiAssemblyIssue = {
  componentId?: string;
  serialNumber?: string;
  severity: "ERROR" | "WARNING";
  message: string;
  source?: "SYSTEM" | "HERMES";
};

type AiAssemblyResult = {
  compatible: boolean;
  confidence?: number;
  issues: AiAssemblyIssue[];
  aiUnavailable?: boolean;
  aiMessage?: string;
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
  const [attributeDefinitions, setAttributeDefinitions] = useState<ProductAttributeDefinition[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [slotAssignments, setSlotAssignments] = useState<Record<string, { slotType: SlotType; slotName: string }>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [warehouseId, setWarehouseId] = useState("ALL");
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<AiAssemblyResult | null>(null);

  const currentComponents = useMemo(() => {
    if (!parentAsset) return [];
    return allAssets.filter((asset) => asset.parentId === parentAsset.id);
  }, [allAssets, parentAsset]);

  const currentIds = useMemo(() => currentComponents.map((asset) => asset.id), [currentComponents]);
  const availableIds = useMemo(() => availableComponents.map((asset) => asset.id), [availableComponents]);
  const attachIds = selectedIds.filter((id) => availableIds.includes(id) && !currentIds.includes(id));
  const detachIds = currentIds.filter((id) => !selectedIds.includes(id));
  const parentIsServer = isServerProduct(parentAsset?.product);
  const parentIsInStock = parentAsset?.status === "IN_STOCK";
  const dimmSlots = useMemo(() => getSlotNames(parentAsset?.product, "DIMM"), [parentAsset?.product]);
  const driveBaySlots = useMemo(() => getSlotNames(parentAsset?.product, "DRIVE_BAY"), [parentAsset?.product]);
  const currentSlotChanges = currentComponents.filter((asset) => {
    if (!selectedIds.includes(asset.id)) return false;
    const requiredSlotType = componentSlotType(asset);
    if (!requiredSlotType) return false;
    const assigned = slotAssignments[asset.id];
    if (!assigned?.slotName) return false;
    return assigned?.slotType !== asset.installSlotType || assigned?.slotName !== asset.installSlotName;
  });
  const hasChanges = attachIds.length > 0 || detachIds.length > 0 || currentSlotChanges.length > 0;

  const selectedComponents = useMemo(() => {
    const map = new Map<string, AssemblyAsset>();
    for (const asset of currentComponents) map.set(asset.id, asset);
    for (const asset of availableComponents) {
      if (selectedIds.includes(asset.id)) map.set(asset.id, asset);
    }
    return Array.from(map.values());
  }, [currentComponents, availableComponents, selectedIds]);

  const orderedSelectedComponents = useMemo(() => {
    const selectedOrder = new Map(selectedIds.map((id, index) => [id, index]));
    return [...selectedComponents].sort((a, b) => {
      const aIsCurrent = currentIds.includes(a.id);
      const bIsCurrent = currentIds.includes(b.id);
      const aWillDetach = aIsCurrent && !selectedIds.includes(a.id);
      const bWillDetach = bIsCurrent && !selectedIds.includes(b.id);
      const aIsNew = !aIsCurrent && selectedIds.includes(a.id);
      const bIsNew = !bIsCurrent && selectedIds.includes(b.id);

      const rank = (isNew: boolean, isCurrent: boolean, willDetach: boolean) => {
        if (isNew) return 0;
        if (isCurrent && !willDetach) return 1;
        return 2;
      };

      const rankDiff = rank(aIsNew, aIsCurrent, aWillDetach) - rank(bIsNew, bIsCurrent, bWillDetach);
      if (rankDiff !== 0) return rankDiff;

      if (aIsNew && bIsNew) {
        return (selectedOrder.get(b.id) ?? 0) - (selectedOrder.get(a.id) ?? 0);
      }
      return a.product.name.localeCompare(b.product.name) || a.serialNumber.localeCompare(b.serialNumber);
    });
  }, [currentIds, selectedComponents, selectedIds]);

  const allVisibleAvailableSelected = availableIds.length > 0 && availableIds.every((id) => selectedIds.includes(id));
  const selectedFilterCategory = useMemo(
    () => categories.find((item) => item.code === category),
    [categories, category]
  );
  const componentFilterDefinitions = useMemo(() => {
    if (!selectedFilterCategory) return [];
    return attributeDefinitions
      .filter((definition) => definition.categoryId === selectedFilterCategory.id && definition.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }, [attributeDefinitions, selectedFilterCategory]);

  useEffect(() => {
    if (!open || !parentAsset) return;
    setSearch("");
    setCategory("ALL");
    setWarehouseId("ALL");
    setAttributeFilters({});
    setAiResult(null);
    fetchInitialData(parentAsset.id);
  }, [open, parentAsset?.id]);

  useEffect(() => {
    if (!open || !parentAsset) return;
    const timer = setTimeout(() => fetchAvailableComponents(), 300);
    return () => clearTimeout(timer);
  }, [open, parentAsset?.id, search, category, warehouseId, attributeFilters, componentFilterDefinitions]);

  const parseList = async (res: Response) => {
    const json = await res.json().catch(() => null);
    return Array.isArray(json) ? json : json?.data || [];
  };

  const fetchInitialData = async (parentId: string) => {
    setLoading(true);
    try {
      const [assetsRes, warehousesRes, categoriesRes, definitionsRes] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/warehouses"),
        fetch("/api/product-categories"),
        fetch("/api/product-attribute-definitions?activeOnly=true"),
      ]);
      const assets = await parseList(assetsRes);
      setAllAssets(assets);
      setWarehouses(await parseList(warehousesRes));
      setCategories(await parseList(categoriesRes));
      setAttributeDefinitions(await parseList(definitionsRes));
      const current = assets.filter((asset: AssemblyAsset) => asset.parentId === parentId);
      setSelectedIds(current.map((asset: AssemblyAsset) => asset.id));
      setSlotAssignments(current.reduce((acc: Record<string, { slotType: SlotType; slotName: string }>, asset: AssemblyAsset) => {
        const slotType = componentSlotType(asset);
        if (slotType && asset.installSlotName) acc[asset.id] = { slotType, slotName: asset.installSlotName };
        return acc;
      }, {}));
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
      for (const definition of componentFilterDefinitions) {
        const value = attributeFilters[definition.key];
        if (!value || value === "none") continue;
        if (definition.inputType === "SELECT" || definition.inputType === "BOOLEAN" || definition.inputType === "NUMBER") {
          params.append(`attr_${definition.key}`, value);
        } else {
          params.append(`attrLike_${definition.key}`, value);
        }
      }

      const res = await fetch(`/api/assets?${params.toString()}`);
      setAvailableComponents(await parseList(res));
    } catch (error) {
      setAvailableComponents([]);
      toast.error("Lỗi tải linh kiện rời");
    }
  };

  const setAttributeFilter = (key: string, value: string) => {
    setAttributeFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAttributeFilters = () => {
    setAttributeFilters({});
  };

  const handleCategoryFilterChange = (nextCategory: string) => {
    setCategory(nextCategory);
    setAttributeFilters({});
  };

  const renderAttributeFilter = (definition: ProductAttributeDefinition) => {
    const value = attributeFilters[definition.key] || "";
    const controlClassName = "h-9 w-[150px] shrink-0 bg-white border-slate-200 text-sm";

    if (definition.inputType === "SELECT" || definition.inputType === "BOOLEAN") {
      const options = definition.inputType === "BOOLEAN"
        ? [
          { id: "true", value: "true", label: "Có" },
          { id: "false", value: "false", label: "Không" },
        ]
        : definition.options.filter((option) => option.isActive !== false);

      return (
        <Select key={definition.id} value={value || "none"} onValueChange={(next) => setAttributeFilter(definition.key, next)}>
          <SelectTrigger className={controlClassName}>
            <SelectValue placeholder={definition.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-- {definition.label} --</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.label || option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        key={definition.id}
        value={value}
        placeholder={definition.label}
        type={definition.inputType === "NUMBER" ? "number" : "text"}
        min={definition.inputType === "NUMBER" ? 1 : undefined}
        step={definition.inputType === "NUMBER" ? 1 : undefined}
        onChange={(event) => setAttributeFilter(definition.key, event.target.value)}
        className={controlClassName}
      />
    );
  };

  const toggleId = (id: string, checked: boolean) => {
    const asset = [...availableComponents, ...currentComponents].find((item) => item.id === id);
    if (checked && asset && componentSlotType(asset) && !parentIsServer) {
      toast.error("RAM và ổ cứng chỉ được lắp vào Server.");
      return;
    }
    setAiResult(null);
    setSelectedIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id));
  };

  const setSlotAssignment = (componentId: string, slotType: SlotType, slotName: string) => {
    setAiResult(null);
    setSlotAssignments((prev) => ({ ...prev, [componentId]: { slotType, slotName } }));
  };

  const getSlotOptions = (slotType: SlotType) => slotType === "DIMM" ? dimmSlots : driveBaySlots;

  const attachSlotComponents = selectedComponents.filter((asset) => {
    return attachIds.includes(asset.id) && componentSlotType(asset);
  });

  const attachSlotConfigMissing = attachSlotComponents.find((asset) => {
    const slotType = componentSlotType(asset);
    return slotType && getSlotOptions(slotType).length === 0;
  });

  const missingAttachSlotComponents = attachSlotComponents.filter((asset) => {
    return !slotAssignments[asset.id]?.slotName;
  });

  const usedSlotKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const id of selectedIds) {
      const assignment = slotAssignments[id];
      if (assignment?.slotName) keys.add(`${assignment.slotType}:${assignment.slotName}`);
    }
    return keys;
  }, [selectedIds, slotAssignments]);

  const duplicateSlotExists = selectedComponents.some((asset) => {
    const assignment = slotAssignments[asset.id];
    if (!assignment?.slotName) return false;
    return selectedComponents.some((other) =>
      other.id !== asset.id &&
      selectedIds.includes(other.id) &&
      slotAssignments[other.id]?.slotType === assignment.slotType &&
      slotAssignments[other.id]?.slotName === assignment.slotName
    );
  });

  const detachAll = () => {
    setAiResult(null);
    setSelectedIds([]);
  };

  const detachGroup = (ids: string[]) => {
    setAiResult(null);
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const validateWithAi = async () => {
    if (!parentAsset) return true;

    const idsToValidate = Array.from(new Set([
      ...attachIds,
      ...currentSlotChanges.map((asset) => asset.id),
    ])).filter((id) => {
      const asset = selectedComponents.find((component) => component.id === id);
      return Boolean(asset);
    });

    if (idsToValidate.length === 0) {
      setAiResult(null);
      return true;
    }

    setAiChecking(true);
    try {
      const res = await fetch("/api/ai/assembly/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: parentAsset.id, componentIds: idsToValidate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Không thể kiểm tra tương thích bằng AI");

      const result: AiAssemblyResult = {
        compatible: json.compatible !== false,
        confidence: json.confidence,
        issues: Array.isArray(json.issues) ? json.issues : [],
        aiUnavailable: json.aiUnavailable,
        aiMessage: json.aiMessage,
      };
      setAiResult(result);

      if (result.aiUnavailable && result.issues.length === 0) {
        toast.warning(result.aiMessage || "AI chưa phản hồi, hệ thống sẽ tiếp tục kiểm tra bằng rule nội bộ.");
        return true;
      }

      if (!result.compatible || result.issues.some((issue) => issue.severity === "ERROR")) {
        toast.warning("AI cảnh báo linh kiện có thể không phù hợp với server. Hệ thống vẫn cho phép lưu.");
        return true;
      }

      if (result.issues.length > 0) {
        toast.warning("AI có cảnh báo tương thích, vui lòng kiểm tra lại.");
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể kiểm tra tương thích bằng AI";
      setAiResult({
        compatible: true,
        issues: [],
        aiUnavailable: true,
        aiMessage: message,
      });
      toast.warning(`${message}. Hệ thống sẽ tiếp tục dùng rule nội bộ.`);
      return true;
    } finally {
      setAiChecking(false);
    }
  };

  const handleSave = async () => {
    if (!parentAsset || !hasChanges) return;
    if (!parentIsInStock) {
      toast.error("Chỉ được lắp ráp khi server đang ở trạng thái Trong kho. Vui lòng đổi trạng thái server trước.");
      return;
    }
    if (attachSlotConfigMissing) {
      toast.error("Server chưa khai báo số DIMM/Bay. Vui lòng cập nhật thông tin server trước khi lắp RAM/ổ cứng mới.");
      return;
    }
    if (missingAttachSlotComponents.length > 0) {
      toast.error("Khi lắp mới/lắp lại RAM hoặc ổ cứng, bắt buộc chọn DIMM/Bay để hoàn thiện dữ liệu.");
      return;
    }
    if (duplicateSlotExists) {
      toast.error("Có DIMM/Bay đang được chọn trùng. Vui lòng kiểm tra lại.");
      return;
    }
    const aiPassed = await validateWithAi();
    if (!aiPassed) return;

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
          body: JSON.stringify({
            type: "ATTACH_BULK",
            parentId: parentAsset.id,
            componentIds: attachIds,
            slotAssignments: attachIds
              .filter((id) => slotAssignments[id]?.slotName)
              .map((id) => ({ componentId: id, ...slotAssignments[id] })),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Không thể lắp linh kiện");
      }

      if (currentSlotChanges.length > 0) {
        const res = await fetch("/api/assembly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "UPDATE_SLOTS",
            parentId: parentAsset.id,
            slotAssignments: currentSlotChanges.map((asset) => ({ componentId: asset.id, ...slotAssignments[asset.id] })),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Không thể cập nhật slot");
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
          {!parentIsInStock && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Chỉ server đang ở trạng thái <strong>Trong kho</strong> mới được lắp/tháo/cập nhật cấu hình. Vui lòng đổi trạng thái server trước khi lắp ráp.
            </div>
          )}
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
            <Select value={category} onValueChange={handleCategoryFilterChange}>
              <SelectTrigger className="w-[180px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả linh kiện</SelectItem>
                {categories.filter((item) => !item.isMain).map((item) => (
                  <SelectItem key={item.id} value={item.code}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {componentFilterDefinitions.map(renderAttributeFilter)}
            {componentFilterDefinitions.length > 0 && Object.values(attributeFilters).some((value) => value && value !== "none") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAttributeFilters}
                className="h-9 px-2 text-slate-500 hover:text-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Xóa lọc thuộc tính
              </Button>
            )}
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
                          {componentSlotType(component) && !parentIsServer && (
                            <p className="text-[11px] text-red-600 mt-0.5">Chỉ lắp được vào Server</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="overflow-y-auto pl-1 pr-2 space-y-3">
            <div className="pb-2 border-b flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-700">Cấu hình đang chọn ({selectedComponents.length})</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đang lắp: {currentComponents.length} | Lắp thêm: {attachIds.length} | Sẽ tháo: {detachIds.length}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.length === 0}
                onClick={detachAll}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                <Unlink className="w-4 h-4 mr-2" />
                Tháo tất cả
              </Button>
            </div>
            {orderedSelectedComponents.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-8">Chưa có linh kiện nào.</p>
            ) : (
              groupByCategory(orderedSelectedComponents).map(([code, group]) => (
                <div key={code} className="space-y-1.5">
                  <div className={`flex items-center justify-between px-2 py-1 rounded-md border text-xs font-bold ${CATEGORY_STYLES[code] || CATEGORY_STYLES.OTHER}`}>
                    <span>{group.label}</span>
                    <div className="flex items-center gap-2">
                      <span>{group.items.length}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!group.items.some((item) => selectedIds.includes(item.id))}
                        onClick={() => detachGroup(group.items.map((item) => item.id))}
                        className="h-6 px-2 text-[11px] text-red-700 hover:bg-red-50"
                      >
                        <Unlink className="w-3 h-3 mr-1" />
                        Tháo hết
                      </Button>
                    </div>
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
                          {selectedIds.includes(component.id) && componentSlotType(component) && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-500">
                                {componentSlotType(component) === "DIMM" ? "DIMM" : "Bay"}
                              </span>
                              <Select
                                value={slotAssignments[component.id]?.slotName || ""}
                                onValueChange={(slotName) => setSlotAssignment(component.id, componentSlotType(component)!, slotName)}
                              >
                                <SelectTrigger className="h-8 w-[160px] bg-white">
                                  <SelectValue placeholder="Chọn slot nếu có" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getSlotOptions(componentSlotType(component)!).map((slotName) => {
                                    const key = `${componentSlotType(component)}:${slotName}`;
                                    const usedByOther = usedSlotKeys.has(key) && slotAssignments[component.id]?.slotName !== slotName;
                                    return (
                                      <SelectItem key={slotName} value={slotName} disabled={usedByOther}>
                                        {slotName}{usedByOther ? " (đã dùng)" : ""}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              {getSlotOptions(componentSlotType(component)!).length === 0 && (
                                <span className="text-xs text-amber-600">
                                  {isCurrent ? "Chưa khai báo slot, vẫn có thể giữ/tháo linh kiện cũ" : "Cần khai báo số slot trước khi lắp mới"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {aiResult && (
          <div className={`mx-6 mb-3 rounded-xl border px-4 py-3 ${aiResult.compatible && !aiResult.aiUnavailable ? "border-emerald-200 bg-emerald-50" : aiResult.aiUnavailable ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
            <div className="flex items-start gap-3">
              {aiResult.compatible && !aiResult.aiUnavailable ? (
                <BrainCircuit className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${aiResult.aiUnavailable ? "text-amber-600" : "text-red-600"}`} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm font-bold ${aiResult.compatible && !aiResult.aiUnavailable ? "text-emerald-800" : aiResult.aiUnavailable ? "text-amber-800" : "text-red-800"}`}>
                    {aiResult.aiUnavailable
                      ? "AI chưa sẵn sàng"
                      : aiResult.compatible
                        ? "AI không phát hiện lỗi tương thích"
                        : "AI cảnh báo linh kiện có thể không phù hợp"}
                  </p>
                  {typeof aiResult.confidence === "number" && (
                    <Badge variant="outline" className="bg-white/70">
                      Tin cậy {Math.round(aiResult.confidence * 100)}%
                    </Badge>
                  )}
                </div>
                {aiResult.aiMessage && (
                  <p className="mt-1 text-xs text-amber-700">{aiResult.aiMessage}</p>
                )}
                {aiResult.issues.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {aiResult.issues.map((issue, index) => (
                      <div key={`${issue.componentId || issue.serialNumber || index}-${index}`} className="flex items-start gap-2 text-xs">
                        <Badge variant="outline" className={issue.severity === "ERROR" ? "border-red-200 bg-white text-red-700" : "border-amber-200 bg-white text-amber-700"}>
                          {issue.source === "SYSTEM" ? "Rule" : "Hermes"}
                        </Badge>
                        <span className={issue.severity === "ERROR" ? "text-red-700" : "text-amber-700"}>
                          {issue.serialNumber ? `${issue.serialNumber}: ` : ""}{issue.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t bg-slate-50">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button type="button" disabled={!parentIsInStock || !hasChanges || saving || aiChecking} onClick={handleSave} className="bg-blue-600 text-white">
            {saving || aiChecking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
            {aiChecking ? "AI đang kiểm tra..." : saving ? "Đang cập nhật..." : "Cập nhật cấu hình"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
