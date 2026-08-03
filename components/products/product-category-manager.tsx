"use client";

import React, { useState } from "react";
import { Loader2, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export type ProductCategoryOption = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isMain: boolean;
  _count?: { products: number };
};

type Props = {
  categories: ProductCategoryOption[];
  onRefresh: () => void;
};

const emptyForm = { id: "", code: "", name: "", description: "", isMain: false };

export function ProductCategoryManager({ categories, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const resetForm = () => setForm(emptyForm);

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = form.id ? `/api/product-categories/${form.id}` : "/api/product-categories";
      const res = await fetch(url, {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Không thể lưu danh mục");

      toast.success(form.id ? "Đã cập nhật danh mục" : "Đã thêm danh mục");
      resetForm();
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu danh mục");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category: ProductCategoryOption) => {
    if (!confirm(`Xóa danh mục "${category.name}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/product-categories/${category.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Không thể xóa danh mục");

      toast.success("Đã xóa danh mục");
      if (form.id === category.id) resetForm();
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa danh mục");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="shrink-0 bg-white">
          <Tags className="mr-2 h-4 w-4" /> Danh mục
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-hidden bg-white p-0 sm:max-w-[760px]">
        <DialogHeader className="border-b bg-slate-50 px-4 py-4 pr-10 sm:px-6">
          <DialogTitle>{form.id ? "Sửa danh mục sản phẩm" : "Danh mục sản phẩm"}</DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[calc(90vh-64px)] gap-4 overflow-y-auto p-4 lg:grid-cols-[280px_1fr] lg:gap-5 sm:p-5">
          <form onSubmit={saveCategory} className="space-y-3 rounded-lg border bg-slate-50 p-3 sm:p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{form.id ? "Thông tin danh mục" : "Danh mục mới"}</p>
              <p className="text-xs text-slate-500 mt-0.5">Tạo RAM, Storage, Module, Nguồn, Quạt hoặc nhóm thiết bị riêng.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mã danh mục</label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                placeholder="VD: SERVER"
                className="bg-white font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tên hiển thị</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Máy chủ"
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mô tả</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Tùy chọn"
                className="bg-white"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.isMain}
                onCheckedChange={(checked) => setForm({ ...form, isMain: checked === true })}
              />
              Thiết bị chính
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {form.id ? "Lưu danh mục" : "Thêm danh mục"}
              </Button>
              {form.id && (
                <Button type="button" variant="outline" onClick={resetForm} className="bg-white">
                  Hủy
                </Button>
              )}
            </div>
          </form>

          <div className="max-h-[420px] overflow-y-auto rounded-lg border">
            {categories.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Chưa có danh mục.</div>
            ) : categories.map((category) => (
              <div key={category.id} className="flex flex-col gap-3 border-b p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-800">{category.name}</p>
                    <Badge variant="outline" className="font-mono">{category.code}</Badge>
                    <Badge className={category.isMain ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}>
                      {category.isMain ? "Thiết bị" : "Linh kiện"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {category._count?.products || 0} sản phẩm{category.description ? ` - ${category.description}` : ""}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="justify-center sm:size-9"
                    onClick={() => setForm({
                      id: category.id,
                      code: category.code,
                      name: category.name,
                      description: category.description || "",
                      isMain: category.isMain,
                    })}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sm:hidden">Sửa</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="justify-center text-red-600 hover:text-red-700 sm:size-9"
                    onClick={() => deleteCategory(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sm:hidden">Xóa</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
