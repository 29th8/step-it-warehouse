"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { handleApiResponse } from "@/lib/api-handler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface RackFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    warehouseId: string;
    initialData?: { id: string; name: string; type?: string; totalUnits?: number | null };
}

export function RackFormDialog({ open, onOpenChange, onSuccess, warehouseId, initialData }: RackFormDialogProps) {
    const isEditMode = !!initialData;
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        type: initialData?.type || "DATACENTER",
        totalUnits: initialData?.totalUnits ?? 42,
    });
    const [isSaving, setIsSaving] = useState(false);

    // Reset form khi mở dialog hoặc initialData thay đổi
    useEffect(() => {
        if (open) {
            setFormData({
                name: initialData?.name || "",
                type: initialData?.type || "DATACENTER",
                totalUnits: initialData?.totalUnits ?? 42,
            });
        }
    }, [open, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const method = isEditMode ? "PATCH" : "POST";
            const body = isEditMode
                ? { id: initialData.id, ...formData }
                : { ...formData, warehouseId };

            const res = await fetch("/api/racks", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            await handleApiResponse(res, `Đã ${isEditMode ? 'cập nhật' : 'tạo'} tủ rack thành công!`);

            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-white">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? "Chỉnh sửa Tủ Rack" : "Tạo Tủ Rack mới"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Tên Tủ Rack *</Label>
                        <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Rack A01, Rack B02..." />
                    </div>

                    <div className="space-y-2">
                        <Label>Loại tủ *</Label>
                        <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v, totalUnits: v === "STORAGE" ? 0 : (formData.totalUnits || 42) })}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Chọn loại tủ" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="DATACENTER">🏢 Tủ Rack Datacenter (có vị trí U)</SelectItem>
                                <SelectItem value="STORAGE">📦 Tủ lưu trữ thiết bị (không có U)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.type === "DATACENTER" && (
                        <div className="space-y-2">
                            <Label htmlFor="totalUnits">Tổng số U *</Label>
                            <Input id="totalUnits" type="number" value={formData.totalUnits} onChange={e => setFormData({ ...formData, totalUnits: parseInt(e.target.value) || 0 })} />
                        </div>
                    )}

                    {formData.type === "STORAGE" && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                            📦 Tủ lưu trữ không có vị trí U. Thiết bị đặt trong tủ này sẽ không cần chỉ định rackUnit.
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? "Lưu thay đổi" : "Tạo mới"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}