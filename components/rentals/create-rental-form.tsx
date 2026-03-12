"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { handleApiResponse } from "@/lib/api-handler";

interface AssetOption { id: string; serialNumber: string; }

export function CreateRentalForm() {
  const [availableAssets, setAvailableAssets] = useState<AssetOption[]>([]);
  const [formData, setFormData] = useState({
    assetId: "",
    customerName: "",
    startDate: new Date(),
    durationMonths: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Tải danh sách Server/Switch đang IN_STOCK
    fetch('/api/assets') // Giả định API này có thể lọc theo status và category
      .then(res => res.json())
      .then(data => {
        const rentable = data.filter((a: any) => a.status === 'IN_STOCK' && ['SERVER', 'SWITCH'].includes(a.product.category));
        setAvailableAssets(rentable);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      await handleApiResponse(res, "Tạo hợp đồng thuê thành công!");
      // Reset form hoặc chuyển hướng
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto bg-white p-6 rounded-xl shadow-sm border">
      <div className="space-y-2">
        <label className="font-medium">Thiết bị cho thuê *</label>
        <Select value={formData.assetId} onValueChange={(v) => setFormData({ ...formData, assetId: v })}>
          <SelectTrigger><SelectValue placeholder="Chọn thiết bị có sẵn..." /></SelectTrigger>
          <SelectContent>
            {availableAssets.map(asset => (
              <SelectItem key={asset.id} value={asset.id}>{asset.serialNumber}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="font-medium">Tên khách hàng *</label>
        <Input placeholder="Công ty TNHH ABC" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="font-medium">Ngày bắt đầu *</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.startDate ? format(formData.startDate, "PPP") : <span>Chọn ngày</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.startDate} onSelect={(date) => date && setFormData({ ...formData, startDate: date })} /></PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <label className="font-medium">Thời hạn (Tháng) *</label>
          <Input type="number" min="1" value={formData.durationMonths} onChange={e => setFormData({ ...formData, durationMonths: parseInt(e.target.value) })} />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white">
        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Tạo Hợp đồng
      </Button>
    </form>
  );
}