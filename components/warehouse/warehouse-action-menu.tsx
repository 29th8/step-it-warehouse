"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Trash, Edit, Loader2, Save } from "lucide-react";
import { handleApiResponse } from "@/lib/api-handler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function WarehouseActionMenu({ warehouse, onRefresh }: { warehouse: any, onRefresh: () => void }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: warehouse.name, location: warehouse.location || "" });

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/warehouses/${warehouse.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData)
      });
      await handleApiResponse(res, "Cập nhật thông tin kho thành công!");
      setIsEditOpen(false);
      onRefresh();
    } catch (e) { toast.error("Lỗi khi cập nhật."); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/warehouses/${warehouse.id}`, { method: "DELETE" });
      await handleApiResponse(res, "Đã xóa kho thành công!");
      setIsDeleteOpen(false);
      onRefresh();
    } catch (error: any) { toast.error(error.message, { duration: 6000 }); }
    finally { setIsSaving(false); }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={16} /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white">
          <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="cursor-pointer gap-2"><Edit size={14} className="text-green-600" /> Sửa</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="cursor-pointer gap-2 text-red-600"><Trash size={14} /> Xóa</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (open) setFormData({ name: warehouse.name, location: warehouse.location || "" }) }}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>Sửa thông tin Kho: {warehouse.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Tên Kho *</label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Vị trí</label>
              <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="mt-1" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={isSaving} className="bg-blue-600 text-white">{isSaving && <Loader2 className="animate-spin mr-2" />} Lưu</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader><AlertDialogTitle className="text-red-600">Xác nhận xóa?</AlertDialogTitle><AlertDialogDescription>Bạn sắp xóa Kho: <strong>{warehouse.name}</strong>. Cảnh báo: Chỉ có thể xóa nếu kho không chứa bất kỳ thiết bị hay tủ rack nào.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><Button variant="destructive" onClick={handleDelete} className="bg-red-600">Đồng ý Xóa</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}