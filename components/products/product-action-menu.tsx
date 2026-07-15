"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Trash, Eye, Loader2, Package, Edit3, X, Save, Tag, Box, Server, Factory, AlignLeft } from "lucide-react";
import { handleApiResponse } from "@/lib/api-handler";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { ProductCategoryOption } from "@/components/products/product-category-manager";
import { ProductAttributeFields, validateRequiredAttributes, type ProductAttributeDefinition } from "@/components/products/product-attribute-fields";
import { ServerSpecAiButton } from "@/components/products/server-spec-ai-button";

interface ProductActionMenuProps {
  product: any;
  onRefresh: () => void;
  categories: ProductCategoryOption[];
  attributeDefinitions: ProductAttributeDefinition[];
}

export function ProductActionMenu({ product, onRefresh, categories, attributeDefinitions }: ProductActionMenuProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    modelNumber: "",
    category: "",
    type: "",
    vendor: "",
    description: "",
    attributes: {} as Record<string, any>
  });
  const selectedCategory = categories.find((category) => category.code === formData.category);
  const selectedDefinitions = selectedCategory
    ? attributeDefinitions.filter((definition) => definition.categoryId === selectedCategory.id)
    : [];
  const detailCategory = detailData
    ? categories.find((category) => category.code === detailData.category)
    : undefined;
  const visibleDetailAttributeDefinitions = detailCategory
    ? attributeDefinitions.filter((definition) => definition.categoryId === detailCategory.id && definition.isActive)
    : [];
  const visibleDetailAttributes = detailData?.attributes
    ? Object.entries(detailData.attributes).filter(([key, val]) =>
      val !== undefined &&
      val !== null &&
      visibleDetailAttributeDefinitions.some((definition) => definition.key === key)
    )
    : [];

  // Mở Modal & Fetch Data
  const handleOpenDetail = async () => {
    setIsDetailOpen(true);
    setIsEditMode(false);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/products/${product.id}`);
      if (!res.ok) throw new Error("Không thể tải thông tin");
      const data = await res.json();
      setDetailData(data);

      setFormData({
        name: data.name || "",
        modelNumber: data.modelNumber || "",
        category: data.category || "",
        type: data.type || "",
        vendor: data.vendor || "",
        description: data.description || "",
        attributes: data.attributes ? { ...data.attributes } : {}
      });
    } catch (e) {
      toast.error("Lỗi tải dữ liệu sản phẩm");
      setIsDetailOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Form Cập nhật
  const handleSaveEdit = async (e: React.FormEvent) => {
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
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      await handleApiResponse(res, "Đã cập nhật thông tin sản phẩm!");

      setDetailData({ ...detailData, ...formData });
      setIsEditMode(false);
      setIsDetailOpen(false); // Đóng modal sau khi lưu thành công
      onRefresh();
    } catch (e) {
      toast.error("Lỗi khi lưu thông tin cập nhật");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Xóa danh mục
  const handleDelete = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      await handleApiResponse(res, "Đã xóa sản phẩm thành công!");
      setIsDeleteOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message, { duration: 6000 });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
            <MoreHorizontal size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-white z-50">
          <DropdownMenuItem onClick={handleOpenDetail} className="cursor-pointer gap-2">
            <Eye size={14} className="text-blue-600" /> Chi tiết & Sửa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="cursor-pointer gap-2 text-red-600">
            <Trash size={14} /> Xóa sản phẩm
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDetailOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDetailOpen(false);
          setTimeout(() => setIsEditMode(false), 200);
        }
      }}>
        <DialogContent className="bg-white sm:max-w-[550px] p-0 overflow-hidden">

          <DialogHeader className="p-6 pb-4 border-b bg-slate-50">
            <DialogTitle className="flex items-center gap-2 text-xl text-slate-800">
              <Package className="w-5 h-5 text-blue-600" />
              {isEditMode ? "Chỉnh sửa Sản phẩm" : "Chi tiết Sản phẩm"}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !detailData ? (
            <div className="flex flex-col justify-center items-center h-[300px] text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-600" />
              <p className="text-sm animate-pulse">Đang tải dữ liệu...</p>
            </div>
          ) : !isEditMode ? (

            // ================= CHẾ ĐỘ XEM (VIEW MODE) =================
            <>
              <div className="p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200 min-h-[300px] max-h-[70vh] overflow-y-auto">
                {/* ... (Giữ nguyên View Mode y hệt như cũ) ... */}
                <div className="border-b pb-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Tên sản phẩm</p>
                  <p className="font-extrabold text-slate-900 text-xl leading-tight">{detailData.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-slate-500 mb-1 text-xs font-medium flex items-center gap-1.5"><Box className="w-3.5 h-3.5" /> Model Number</p>
                    <p className="font-mono font-bold text-blue-700 text-base tracking-tight">{detailData.modelNumber}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col justify-between">
                    <div>
                      <p className="text-slate-500 mb-1 text-xs font-medium flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Danh mục / Loại</p>
                      <div className="flex gap-2 mb-2">
                        <Badge variant="secondary" className="bg-slate-200 text-slate-700 hover:bg-slate-200">{detailData.category}</Badge>
                        {detailData.type && <Badge variant="outline" className="text-blue-600 border-blue-200">{detailData.type}</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-slate-500 mb-1 text-xs font-medium flex items-center gap-1.5"><Factory className="w-3.5 h-3.5" /> Hãng (Vendor)</p>
                    <p className="font-bold text-slate-800 text-sm mb-1 uppercase text-blue-800">{detailData.vendor}</p>
                  </div>

                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-center shadow-inner">
                    <p className="text-slate-500 mb-1 text-xs font-medium uppercase tracking-wider">Tồn kho thực tế</p>
                    <p className="font-extrabold text-blue-700 text-2xl flex items-center justify-center gap-2">
                      <Server className="w-5 h-5 opacity-70" /> {detailData._count?.assets || 0}
                    </p>
                  </div>
                </div>

                {/* VISUALIZE JSON ATTRIBUTES */}
                {visibleDetailAttributes.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wider"><AlignLeft className="w-3.5 h-3.5" /> Thông số Kỹ thuật (Attributes)</p>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {visibleDetailAttributes.map(([key, val]) => (
                        <div key={key} className="bg-white px-2 py-1.5 border border-slate-200 rounded flex flex-col shadow-sm">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {visibleDetailAttributeDefinitions.find((definition) => definition.key === key)?.label || key}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">{String(val as string | number | boolean)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wider"><AlignLeft className="w-3.5 h-3.5" /> Mô tả cấu hình</p>
                  <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 min-h-[80px] whitespace-pre-wrap leading-relaxed">
                    {detailData.description || <span className="italic text-slate-400">Không có mô tả nào được ghi nhận.</span>}
                  </div>
                </div>
              </div>

              {/* FOOTER CỦA CHẾ ĐỘ VIEW (Nằm riêng) */}
              <DialogFooter className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="bg-white">
                  <X className="w-4 h-4 mr-2" /> Đóng
                </Button>
                <Button onClick={() => setIsEditMode(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Edit3 className="w-4 h-4 mr-2" /> Sửa thông tin
                </Button>
              </DialogFooter>
            </>

          ) : (

            // ================= CHẾ ĐỘ SỬA (EDIT MODE) =================
            <form onSubmit={handleSaveEdit} className="flex flex-col animate-in slide-in-from-right-4 duration-200">

              <div className="p-6 space-y-5 min-h-[300px] max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Tên sản phẩm *</label>
                  <Input
                    autoFocus
                    placeholder="VD: Dell PowerEdge R740"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Model Number *</label>
                    <Input
                      placeholder="VD: PE-R740"
                      value={formData.modelNumber}
                      onChange={e => setFormData({ ...formData, modelNumber: e.target.value })}
                      className="bg-white font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Danh mục (Category) *</label>
                    <Select
                      value={formData.category}
                      onValueChange={v => setFormData({ ...formData, category: v, attributes: {} })}
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Phân loại phụ (Type)</label>
                    <Input
                      placeholder="VD: NVME, DDR5, L3 Switch..."
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="bg-white"
                    />
                  </div>
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
                    placeholder="Nhập mô tả về thông số kỹ thuật chung..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="bg-white"
                  />
                </div>
              </div>

              <DialogFooter className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditMode(false)} disabled={isSaving} className="bg-white">
                  <X className="w-4 h-4 mr-2" /> Hủy
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </DialogFooter>

            </form>
          )}

        </DialogContent>
      </Dialog>

      {/* ================= MODAL XÓA (Giữ nguyên) ================= */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Xác nhận xóa sản phẩm?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sắp xóa mẫu sản phẩm <strong className="text-black">{product.name}</strong> khỏi hệ thống.<br /><br />
              <span className="text-amber-600 font-medium">Lưu ý: Bạn chỉ có thể xóa sản phẩm này nếu KHÔNG CÒN thiết bị nào trong kho thuộc mẫu mã này.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Hủy</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Đồng ý Xóa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
