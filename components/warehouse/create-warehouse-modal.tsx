"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Save, X, Warehouse as WarehouseIcon } from "lucide-react";
import { handleApiResponse } from "@/lib/api-handler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export function CreateWarehouseModal({ onRefresh }: { onRefresh: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initialForm = { name: "", location: "" };
  const [formData, setFormData] = useState(initialForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Vui lòng điền Tên kho.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData),
      });
      await handleApiResponse(res, "Đã thêm kho mới thành công!");
      setIsOpen(false);
      onRefresh();
    } catch (error) {
      toast.error("Không thể tạo kho mới.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (open) setFormData(initialForm); }}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-10">
          <Plus className="w-4 h-4 mr-2" /> Thêm Kho Mới
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-slate-50">
          <DialogTitle className="flex items-center gap-2 text-xl"><WarehouseIcon className="w-5 h-5 text-blue-600" /> Tạo Kho bãi mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên Kho *</label>
              <Input autoFocus placeholder="VD: Kho chính Datacenter, Kho Linh kiện..." value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Vị trí (Địa chỉ)</label>
              <Input placeholder="VD: Tầng 3, Tòa nhà ABC, Hà Nội" value={formData.location || ""} onChange={e => setFormData({ ...formData, location: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Hủy</Button>
            <Button type="submit" disabled={isSaving} className="bg-blue-600 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Thêm Kho
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}