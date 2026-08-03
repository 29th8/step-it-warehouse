"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner"; // IMPORT TRỰC TIẾP

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types
import { Asset } from "@/types/rental";

export default function CreateRentalPage() {
  const router = useRouter();

  // Data States
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    assetId: "",
    customerName: "",
    startDate: new Date().toISOString().split("T")[0],
    durationMonths: "1",
  });

  // 1. Fetch Assets (IN_STOCK)
  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoadingAssets(true);
      try {
        const res = await fetch("/api/assets?type=available_for_rental");
        if (!res.ok) throw new Error("Failed to fetch assets");

        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data || [];
        setAssets(list);
    } catch {
      toast.error("Không thể tải danh sách thiết bị khả dụng.");
      } finally {
        setIsLoadingAssets(false);
      }
    };
    fetchAssets();
  }, []);

  // 2. Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assetId || !formData.customerName || !formData.startDate) {
      toast.warning("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: formData.assetId,
          customerName: formData.customerName,
          startDate: new Date(formData.startDate),
          durationMonths: parseInt(formData.durationMonths),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Lỗi tạo hợp đồng");
      }

      toast.success("Hợp đồng thuê đã được khởi tạo thành công.");

      router.push("/rentals");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Có lỗi xảy ra khi tạo hợp đồng.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-3 sm:p-4 md:p-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 md:mb-6 pl-0 hover:pl-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Tạo Hợp Đồng Thuê</CardTitle>
          <CardDescription>
            Chọn thiết bị có sẵn trong kho và nhập thông tin khách hàng thuê.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">

            {/* Field: Asset Selection */}
            <div className="space-y-2">
              <Label htmlFor="asset">Thiết bị trong kho <span className="text-red-500">*</span></Label>
              <Select
                value={formData.assetId}
                onValueChange={(val) => setFormData({ ...formData, assetId: val })}
                disabled={isLoadingAssets}
              >
                <SelectTrigger id="asset">
                  <SelectValue placeholder={isLoadingAssets ? "Đang tải..." : "Chọn thiết bị..."} />
                </SelectTrigger>
                <SelectContent>
                  {assets.length === 0 ? (
                    <SelectItem value="none" disabled>Không có thiết bị khả dụng</SelectItem>
                  ) : (
                    assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        <span className="font-medium text-foreground">{asset.product.name}</span>
                        <span className="ml-2 text-muted-foreground">({asset.serialNumber})</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Field: Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="customerName">Tên Khách Hàng <span className="text-red-500">*</span></Label>
              <Input
                id="customerName"
                placeholder="Nhập tên công ty hoặc cá nhân..."
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field: Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Ngày bắt đầu <span className="text-red-500">*</span></Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              {/* Field: Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Thời hạn thuê <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.durationMonths}
                  onValueChange={(val) => setFormData({ ...formData, durationMonths: val })}
                >
                  <SelectTrigger id="duration">
                    <SelectValue placeholder="Chọn thời hạn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Tháng</SelectItem>
                    <SelectItem value="3">3 Tháng</SelectItem>
                    <SelectItem value="6">6 Tháng</SelectItem>
                    <SelectItem value="12">12 Tháng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </CardContent>

          <CardFooter className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              Hủy bỏ
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Tạo Hợp Đồng
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
