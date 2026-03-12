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
import {
  getGenerations,
  getCapacities,
  getStorageTypes,
  getStorageInterfaces,
  getStorageFormFactors,
  getCpuSeries,
  getStorageCapacities
} from "@/lib/product-options";

interface CreateProductProps {
  onRefresh: () => void;
}

export function CreateProductModal({ onRefresh }: CreateProductProps) {
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

    if (formData.category === "MEMORY") {
      if (!formData.attributes.generation || !formData.attributes.capacity) {
        toast.error("RAM/Memory yêu cầu nhập Generation và Capacity");
        return;
      }
    }

    if (formData.category === "STORAGE") {
      if (!formData.attributes.type || !formData.attributes.capacity) {
        toast.error("Storage yêu cầu nhập Type và Capacity");
        return;
      }
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
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="SERVER">Máy chủ (SERVER)</SelectItem>
                    <SelectItem value="MEMORY">RAM / Bộ nhớ (MEMORY)</SelectItem>
                    <SelectItem value="STORAGE">Ổ Cứng (STORAGE)</SelectItem>
                    <SelectItem value="CPU">Vi xử lý (CPU)</SelectItem>
                    <SelectItem value="GPU">Card Đồ Họa (GPU)</SelectItem>
                    <SelectItem value="NETWORK">Mạng (NETWORK)</SelectItem>
                    <SelectItem value="ACCESSORY">Phụ kiện linh tinh (ACCESSORY)</SelectItem>
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

            {/* DYNAMIC ATTRIBUTES FORM */}
            {formData.category === "MEMORY" && (
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Cấu hình Bộ nhớ (RAM)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700">Generation *</label>
                    <Select onValueChange={(v) => setFormData({ ...formData, attributes: { ...formData.attributes, generation: v } })}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="DDR4" /></SelectTrigger>
                      <SelectContent>
                        {getGenerations().map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700">Capacity *</label>
                    <Select onValueChange={(v) => setFormData({ ...formData, attributes: { ...formData.attributes, capacity: v } })}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="32GB" /></SelectTrigger>
                      <SelectContent>
                        {getCapacities().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700">Speed ( MHz )</label>
                    <Input
                      placeholder="VD: 3200MHz"
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, speed: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.category === "STORAGE" && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Cấu hình Lưu trữ
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700">Type *</label>
                    <Select onValueChange={(v) => setFormData({ ...formData, attributes: { ...formData.attributes, type: v } })}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="SSD/HDD" /></SelectTrigger>
                      <SelectContent>{getStorageTypes().map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700">Capacity *</label>

                    <Input
                      placeholder="Ví dụ: 32GB, 1TB..."
                      className="bg-white"
                      value={formData.attributes.capacity || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          attributes: {
                            ...formData.attributes,
                            capacity: e.target.value
                          }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700">Interface</label>
                    <Select onValueChange={(v) => setFormData({ ...formData, attributes: { ...formData.attributes, interface: v } })}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="NVME/SATA" /></SelectTrigger>
                      <SelectContent>{getStorageInterfaces().map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700">Form factor</label>
                    <Select onValueChange={(v) => setFormData({ ...formData, attributes: { ...formData.attributes, formFactor: v } })}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="M.2" /></SelectTrigger>
                      <SelectContent>{getStorageFormFactors().map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {formData.category === "CPU" && (
              <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Cấu hình Vi xử lý
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700">Series</label>
                    <Select onValueChange={(v) => setFormData({ ...formData, attributes: { ...formData.attributes, series: v } })}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Gold/Silver" /></SelectTrigger>
                      <SelectContent>{getCpuSeries().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700">Cores/Threads (Tùy chọn)</label>
                    <Input
                      placeholder="VD: 16C/32T"
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, cores: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            )}



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