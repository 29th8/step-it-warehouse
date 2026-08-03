"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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

  const fetchDefinitions = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!selectedCategoryId && categories.length > 0) {
      const firstComponentCategory = categories.find((category) => !category.isMain) || categories[0];
      setSelectedCategoryId(firstComponentCategory.id);
    }
    fetchDefinitions();
  }, [categories, fetchDefinitions, open, selectedCategoryId]);

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
    } catch {
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

  const updateOption = async (optionId: string, patch: Record<string, unknown>) => {
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
        <Button variant="outline" className="shrink-0 bg-white">
          <Settings2 className="w-4 h-4 mr-2" />
          Thuộc tính
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[92vh] !w-[calc(100vw-1rem)] !max-w-none flex-col overflow-hidden bg-white p-0 md:!w-[96vw]">
        <DialogHeader className="border-b bg-slate-50 px-4 py-4 pr-10 sm:px-6">
          <DialogTitle>Cấu hình thuộc tính sản phẩm</DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
          <div className="hidden space-y-2 overflow-y-auto border-r bg-slate-50/60 p-4 md:block">
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

          <div className="min-w-0 space-y-4 overflow-auto p-4 sm:p-5">
            <div className="space-y-2 md:hidden">
              <label className="text-sm font-medium text-slate-700">Danh mục</label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} ({category.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h3 className="font-bold text-slate-800">{selectedCategory?.name || "Chọn danh mục"}</h3>
              <p className="text-xs text-slate-500">Field dạng Dropdown có thể thêm option như 8GB, 16GB, 750W, 80mm. Kéo tay nắm ở đầu dòng để đổi vị trí hiển thị.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-lg border bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-[160px_220px_160px_120px_48px] xl:items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium">Key</label>
                <Input className="h-11 bg-white xl:h-9" value={newDefinition.key} onChange={(e) => setNewDefinition({ ...newDefinition, key: e.target.value })} placeholder="capacity" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Tên hiển thị</label>
                <Input className="h-11 bg-white xl:h-9" value={newDefinition.label} onChange={(e) => setNewDefinition({ ...newDefinition, label: e.target.value })} placeholder="Dung lượng" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Kiểu</label>
                <Select value={newDefinition.inputType} onValueChange={(value) => setNewDefinition({ ...newDefinition, inputType: value })}>
                  <SelectTrigger className="h-11 bg-white xl:h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INPUT_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Checkbox checked={newDefinition.required} onCheckedChange={(checked) => setNewDefinition({ ...newDefinition, required: Boolean(checked) })} />
                <span className="text-sm whitespace-nowrap">Bắt buộc</span>
              </div>
              <Button type="button" onClick={createDefinition} className="h-11 bg-blue-600 text-white xl:h-9">
                <Plus className="w-4 h-4" />
                <span className="xl:hidden">Thêm thuộc tính</span>
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Đang tải...</p>
            ) : categoryDefinitions.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Danh mục này chưa có thuộc tính.</p>
            ) : (
              <div className="space-y-4">
                {categoryDefinitions.map((definition) => (
                  <div
                    key={definition.id}
                    className={`border rounded-lg bg-white transition-colors ${draggedDefinitionId === definition.id ? "border-blue-300 bg-blue-50/30" : ""}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => reorderDefinition(definition.id)}
                  >
                    <div className="grid grid-cols-1 gap-3 border-b p-3 lg:grid-cols-[36px_160px_220px_160px_120px_80px_48px] lg:items-center">
                      <button
                        type="button"
                        draggable
                        onDragStart={() => setDraggedDefinitionId(definition.id)}
                        onDragEnd={() => setDraggedDefinitionId(null)}
                        className="hidden h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400 cursor-grab active:cursor-grabbing hover:text-slate-700 hover:bg-slate-100 lg:flex"
                        title="Kéo để đổi thứ tự hiển thị"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <div className="space-y-1 lg:space-y-0">
                        <label className="text-xs font-medium text-slate-500 lg:hidden">Key</label>
                        <Input className="h-11 lg:h-9" defaultValue={definition.key} onBlur={(e) => e.target.value !== definition.key && saveDefinition(definition, { key: e.target.value })} />
                      </div>
                      <div className="space-y-1 lg:space-y-0">
                        <label className="text-xs font-medium text-slate-500 lg:hidden">Tên hiển thị</label>
                        <Input className="h-11 lg:h-9" defaultValue={definition.label} onBlur={(e) => e.target.value !== definition.label && saveDefinition(definition, { label: e.target.value })} />
                      </div>
                      <Select value={definition.inputType} onValueChange={(value) => saveDefinition(definition, { inputType: value as ProductAttributeDefinition["inputType"] })}>
                        <SelectTrigger className="h-11 lg:h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(INPUT_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <label className="flex h-11 items-center gap-2 text-sm whitespace-nowrap lg:h-auto">
                        <Checkbox checked={definition.required} onCheckedChange={(checked) => saveDefinition(definition, { required: Boolean(checked) })} />
                        Bắt buộc
                      </label>
                      <Badge variant="outline" className={definition.isActive ? "h-8 justify-center bg-green-50 text-green-700" : "h-8 justify-center bg-slate-50 text-slate-500"}>
                        {definition.isActive ? "Bật" : "Ẩn"}
                      </Badge>
                      <Button type="button" variant="ghost" size="sm" onClick={() => deleteDefinition(definition)} className="h-10 justify-center text-red-600 lg:size-9">
                        <Trash2 className="w-4 h-4" />
                        <span className="lg:hidden">Xóa thuộc tính</span>
                      </Button>
                    </div>

                    {definition.inputType === "SELECT" && (
                      <div className="p-3 space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            className="h-11 sm:h-9"
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
                          <Button type="button" variant="outline" onClick={() => createOption(definition.id)} className="h-11 sm:h-9">
                            <Plus className="w-4 h-4 mr-1" /> Thêm
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {definition.options.map((option) => (
                            <div key={option.id} className="flex items-center gap-1 rounded-md border bg-slate-50 px-2 py-1">
                              <Input
                                className="h-9 w-32 bg-white"
                                defaultValue={option.label || option.value}
                                onBlur={(e) => {
                                  const nextValue = e.target.value.trim();
                                  if (nextValue && nextValue !== option.value) {
                                    updateOption(option.id, { value: nextValue, label: nextValue });
                                  }
                                }}
                              />
                              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-600" onClick={() => deleteOption(option.id)}>
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
