"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Settings2, Plus, Trash2, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { ProductCategoryOption } from "@/components/products/product-category-manager";
import type { ProductAttributeDefinition } from "@/components/products/product-attribute-fields";

type ProductAttributeManagerProps = {
  categories: ProductCategoryOption[];
  onRefresh?: () => void;
};

const INPUT_TYPE_LABELS: Record<string, string> = {
  TEXT: "Nhập text",
  SELECT: "Dropdown",
  NUMBER: "Số",
  BOOLEAN: "Có / Không",
};

export function ProductAttributeManager({ categories, onRefresh }: ProductAttributeManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [definitions, setDefinitions] = useState<ProductAttributeDefinition[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [newDefinition, setNewDefinition] = useState({
    key: "",
    label: "",
    inputType: "SELECT",
    required: false,
  });
  const [newOptionValues, setNewOptionValues] = useState<Record<string, string>>({});
  const [draggedDefinitionId, setDraggedDefinitionId] = useState<string | null>(null);

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const categoryDefinitions = useMemo(
    () => definitions
      .filter((definition) => definition.categoryId === selectedCategoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [definitions, selectedCategoryId]
  );

  useEffect(() => {
    if (!open) return;
    if (!selectedCategoryId && categories.length > 0) {
      const firstComponentCategory = categories.find((category) => !category.isMain) || categories[0];
      setSelectedCategoryId(firstComponentCategory.id);
    }
    fetchDefinitions();
  }, [open]);

  const fetchDefinitions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/product-attribute-definitions");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Không thể tải cấu hình thuộc tính");
      setDefinitions(json.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải cấu hình thuộc tính");
      setDefinitions([]);
    } finally {
      setLoading(false);
    }
  };

  const saveDefinition = async (definition: ProductAttributeDefinition, patch: Partial<ProductAttributeDefinition>) => {
    try {
      const res = await fetch(`/api/product-attribute-definitions/${definition.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Không thể cập nhật thuộc tính");
      toast.success("Đã cập nhật thuộc tính");
      fetchDefinitions();
      onRefresh?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật thuộc tính");
    }
  };

  const createDefinition = async () => {
    if (!selectedCategoryId || !newDefinition.key.trim() || !newDefinition.label.trim()) {
      toast.warning("Vui lòng nhập key và tên hiển thị");
      return;
    }

    const nextSortOrder = categoryDefinitions.length > 0
      ? Math.max(...categoryDefinitions.map((definition) => definition.sortOrder)) + 10
      : 10;

    try {
      const res = await fetch("/api/product-attribute-definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newDefinition, categoryId: selectedCategoryId, sortOrder: nextSortOrder }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Không thể tạo thuộc tính");
      setNewDefinition({ key: "", label: "", inputType: "SELECT", required: false });
      toast.success("Đã tạo thuộc tính");
      fetchDefinitions();
      onRefresh?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo thuộc tính");
    }
  };

  const reorderDefinition = async (targetDefinitionId: string) => {
    if (!draggedDefinitionId || draggedDefinitionId === targetDefinitionId) return;

    const fromIndex = categoryDefinitions.findIndex((definition) => definition.id === draggedDefinitionId);
    const toIndex = categoryDefinitions.findIndex((definition) => definition.id === targetDefinitionId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextDefinitions = [...categoryDefinitions];
    const [moved] = nextDefinitions.splice(fromIndex, 1);
    nextDefinitions.splice(toIndex, 0, moved);

    const updatedDefinitions = nextDefinitions.map((definition, index) => ({
      ...definition,
      sortOrder: (index + 1) * 10,
    }));

    setDefinitions((prev) => [
      ...prev.filter((definition) => definition.categoryId !== selectedCategoryId),
      ...updatedDefinitions,
    ]);

    setDraggedDefinitionId(null);

    try {
      await Promise.all(updatedDefinitions.map((definition) =>
        fetch(`/api/product-attribute-definitions/${definition.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: definition.sortOrder }),
        })
      ));
      fetchDefinitions();
      onRefresh?.();
      toast.success("Đã cập nhật thứ tự hiển thị");
    } catch (error) {
      toast.error("Không thể cập nhật thứ tự hiển thị");
      fetchDefinitions();
    }
  };

  const deleteDefinition = async (definition: ProductAttributeDefinition) => {
    if (!confirm(`Xóa thuộc tính "${definition.label}"? Dữ liệu JSON trong sản phẩm cũ vẫn được giữ.`)) return;
    try {
      const res = await fetch(`/api/product-attribute-definitions/${definition.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Không thể xóa thuộc tính");
      toast.success("Đã xóa thuộc tính");
      fetchDefinitions();
      onRefresh?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa thuộc tính");
    }
  };

  const createOption = async (definitionId: string) => {
    const value = (newOptionValues[definitionId] || "").trim();
    if (!value) return;

    try {
      const res = await fetch("/api/product-attribute-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ definitionId, value, label: value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Không thể thêm option");
      setNewOptionValues((prev) => ({ ...prev, [definitionId]: "" }));
      toast.success("Đã thêm option");
      fetchDefinitions();
      onRefresh?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm option");
    }
  };

  const updateOption = async (optionId: string, patch: Record<string, any>) => {
    try {
      const res = await fetch(`/api/product-attribute-options/${optionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Không thể cập nhật option");
      fetchDefinitions();
      onRefresh?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật option");
    }
  };

  const deleteOption = async (optionId: string) => {
    try {
      const res = await fetch(`/api/product-attribute-options/${optionId}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Không thể xóa option");
      fetchDefinitions();
      onRefresh?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa option");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white">
          <Settings2 className="w-4 h-4 mr-2" />
          Thuộc tính
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white !w-[98vw] !max-w-none h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50">
          <DialogTitle>Cấu hình thuộc tính sản phẩm</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] flex-1 min-h-0">
          <div className="border-r bg-slate-50/60 p-4 space-y-2 overflow-y-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm border ${selectedCategoryId === category.id ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold" : "bg-white border-slate-200 text-slate-700"}`}
              >
                {category.name}
                <span className="block text-[11px] text-slate-400">{category.code}</span>
              </button>
            ))}
          </div>

          <div className="p-5 overflow-auto space-y-5 min-w-0">
            <div>
              <h3 className="font-bold text-slate-800">{selectedCategory?.name || "Chọn danh mục"}</h3>
              <p className="text-xs text-slate-500">Field dạng Dropdown có thể thêm option như 8GB, 16GB, 750W, 80mm. Kéo tay nắm ở đầu dòng để đổi vị trí hiển thị.</p>
            </div>

            <div className="min-w-[760px] grid grid-cols-[160px_220px_160px_120px_48px] gap-2 items-end border rounded-lg p-3 bg-slate-50">
              <div className="space-y-1">
                <label className="text-xs font-medium">Key</label>
                <Input value={newDefinition.key} onChange={(e) => setNewDefinition({ ...newDefinition, key: e.target.value })} placeholder="capacity" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Tên hiển thị</label>
                <Input value={newDefinition.label} onChange={(e) => setNewDefinition({ ...newDefinition, label: e.target.value })} placeholder="Dung lượng" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Kiểu</label>
                <Select value={newDefinition.inputType} onValueChange={(value) => setNewDefinition({ ...newDefinition, inputType: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INPUT_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Checkbox checked={newDefinition.required} onCheckedChange={(checked) => setNewDefinition({ ...newDefinition, required: Boolean(checked) })} />
                <span className="text-sm whitespace-nowrap">Bắt buộc</span>
              </div>
              <Button type="button" onClick={createDefinition} className="bg-blue-600 text-white">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Đang tải...</p>
            ) : categoryDefinitions.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Danh mục này chưa có thuộc tính.</p>
            ) : (
              <div className="space-y-4 min-w-[860px]">
                {categoryDefinitions.map((definition) => (
                  <div
                    key={definition.id}
                    className={`border rounded-lg bg-white transition-colors ${draggedDefinitionId === definition.id ? "border-blue-300 bg-blue-50/30" : ""}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => reorderDefinition(definition.id)}
                  >
                    <div className="grid grid-cols-[36px_160px_220px_160px_120px_80px_48px] gap-2 p-3 items-center border-b">
                      <button
                        type="button"
                        draggable
                        onDragStart={() => setDraggedDefinitionId(definition.id)}
                        onDragEnd={() => setDraggedDefinitionId(null)}
                        className="h-9 w-9 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400 cursor-grab active:cursor-grabbing hover:text-slate-700 hover:bg-slate-100"
                        title="Kéo để đổi thứ tự hiển thị"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <Input defaultValue={definition.key} onBlur={(e) => e.target.value !== definition.key && saveDefinition(definition, { key: e.target.value })} />
                      <Input defaultValue={definition.label} onBlur={(e) => e.target.value !== definition.label && saveDefinition(definition, { label: e.target.value })} />
                      <Select value={definition.inputType} onValueChange={(value) => saveDefinition(definition, { inputType: value as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(INPUT_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                        <Checkbox checked={definition.required} onCheckedChange={(checked) => saveDefinition(definition, { required: Boolean(checked) })} />
                        Bắt buộc
                      </label>
                      <Badge variant="outline" className={definition.isActive ? "justify-center bg-green-50 text-green-700" : "justify-center bg-slate-50 text-slate-500"}>
                        {definition.isActive ? "Bật" : "Ẩn"}
                      </Badge>
                      <Button type="button" variant="ghost" size="icon" onClick={() => deleteDefinition(definition)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {definition.inputType === "SELECT" && (
                      <div className="p-3 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={newOptionValues[definition.id] || ""}
                            onChange={(e) => setNewOptionValues((prev) => ({ ...prev, [definition.id]: e.target.value }))}
                            placeholder="Thêm option, ví dụ 256GB"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                createOption(definition.id);
                              }
                            }}
                          />
                          <Button type="button" variant="outline" onClick={() => createOption(definition.id)}>
                            <Plus className="w-4 h-4 mr-1" /> Thêm
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {definition.options.map((option) => (
                            <div key={option.id} className="flex items-center gap-1 rounded-md border bg-slate-50 px-2 py-1">
                              <Input
                                className="h-7 w-28 bg-white"
                                defaultValue={option.label || option.value}
                                onBlur={(e) => {
                                  const nextValue = e.target.value.trim();
                                  if (nextValue && nextValue !== option.value) {
                                    updateOption(option.id, { value: nextValue, label: nextValue });
                                  }
                                }}
                              />
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => deleteOption(option.id)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
