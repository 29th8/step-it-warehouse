"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Save, X, Package } from "lucide-react";
import { handleApiResponse } from "@/lib/api-handler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import type { ProductCategoryOption } from "@/components/products/product-category-manager";
import { ProductAttributeFields, validateRequiredAttributes, type ProductAttributeDefinition } from "@/components/products/product-attribute-fields";
import { ServerSpecAiButton } from "@/components/products/server-spec-ai-button";

interface CreateProductProps {
  onRefresh: () => void;
  categories: ProductCategoryOption[];
  attributeDefinitions: ProductAttributeDefinition[];
}

export function CreateProductModal({ onRefresh, categories, attributeDefinitions }: CreateProductProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialForm = {
    name: "",
    modelNumber: "",
    category: "",
    type: "",
    vendor: "",
    description: "",
    attributes: {} as Record<string, any>
  };
  const [formData, setFormData] = useState(initialForm);
  const selectedCategory = categories.find((category) => category.code === formData.category);
  const selectedDefinitions = selectedCategory
    ? attributeDefinitions.filter((definition) => definition.categoryId === selectedCategory.id)
    : [];

  // Xử lý mở/đóng Modal
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) setFormData(initialForm); // Reset form mỗi khi mở lại
  };

  // Submit Form Tạo mới
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ==========================================
    // MANUAL VALIDATION (Kiểm tra thủ công)
    // ==========================================
    if (!formData.name || !formData.modelNumber || !formData.category || !formData.vendor) {
      toast.error("Vui lòng điền đầy đủ các thông tin tĩnh bắt buộc (*)");
      return;
    }

    const missingAttributes = validateRequiredAttributes(selectedDefinitions, formData.attributes);
    if (missingAttributes.length > 0) {
      toast.error(`Vui lòng nhập: ${missingAttributes.join(", ")}`);
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      await handleApiResponse(res, "Đã thêm danh mục sản phẩm mới!");

      setIsOpen(false);
      onRefresh(); // Refresh bảng bên ngoài
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Thêm Sản phẩm
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-white sm:max-w-[550px] p-0 overflow-hidden">

        {/* HEADER MODAL */}
        <DialogHeader className="p-6 pb-4 border-b bg-slate-50">
          <DialogTitle className="flex items-center gap-2 text-xl text-slate-800">
            <Package className="w-5 h-5 text-blue-600" /> Tạo Danh mục mới
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>

          {/* BODY CỦA FORM */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Tên sản phẩm *</label>
              <Input
                autoFocus
                placeholder="VD: Dell PowerEdge R740"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Model Number *</label>
                <Input
                  placeholder="VD: PE-R740"
                  value={formData.modelNumber}
                  onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                  className="bg-white font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Danh mục (Category) *</label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v, attributes: {} })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.code}>
                        {category.name} ({category.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Vendor / Hãng Sản Xuất *</label>
                <Input
                  required
                  placeholder="VD: Dell, HP, Samsung, Cisco..."
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="bg-white"
                />
              </div>
              {!["MEMORY", "STORAGE", "CPU"].includes(formData.category) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Phân loại phụ (Type)</label>
                  <Input
                    placeholder="VD: L3 Switch, Fiber..."
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="bg-white"
                  />
                </div>
              )}
            </div>

            <ProductAttributeFields
              definitions={selectedDefinitions}
              values={formData.attributes}
              onChange={(attributes) => setFormData({ ...formData, attributes })}
            />

            <ServerSpecAiButton
              formData={formData}
              setFormData={setFormData}
              attributeDefinitions={selectedDefinitions}
              disabled={isSaving}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Mô tả cấu hình (Tùy chọn)</label>
              <Textarea
                rows={4}
                placeholder="Nhập mô tả về thông số kỹ thuật chung của dòng sản phẩm này..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-white"
              />
            </div>

          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving} className="bg-white">
              <X className="w-4 h-4 mr-2" /> Hủy
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {isSaving ? "Đang xử lý..." : "Thêm Sản phẩm"}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
}
