"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link, Plus, Loader2, Filter, Search } from "lucide-react";
import { handleApiResponse } from "@/lib/api-handler";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getGenerations,
  getStorageTypes,
  getStorageInterfaces,
  getCpuSeries
} from "@/lib/product-options";

interface AssembleActionProps {
  parentId: string;
  onRefresh: () => void;
}

interface AvailableComponent {
  id: string;
  serialNumber: string;
  product?: { name: string };
}

export function AssembleAction({ parentId, onRefresh }: AssembleActionProps) {
  const [availableComponents, setAvailableComponents] = useState<AvailableComponent[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // States Lọc Động Mới
  const [searchQuery, setSearchQuery] = useState("");
  const [selCategory, setSelCategory] = useState<string>("ALL");
  const [selGeneration, setSelGeneration] = useState<string>("");
  const [selCapacity, setSelCapacity] = useState<string>("");
  const [selAttrType, setSelAttrType] = useState<string>("");
  const [selInterface, setSelInterface] = useState<string>("");
  const [selSeries, setSelSeries] = useState<string>("");

  useEffect(() => {
    const fetchAvailableComponents = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("component", "true");

        if (selCategory !== "ALL") params.append("category", selCategory);
        if (searchQuery) params.append("search", searchQuery);

        if (selCategory === "MEMORY") {
          if (selGeneration && selGeneration !== "none") params.append("generation", selGeneration);
          if (selCapacity && selCapacity !== "none") params.append("capacity", selCapacity);
        }

        if (selCategory === "STORAGE") {
          if (selAttrType && selAttrType !== "none") params.append("attrType", selAttrType);
          if (selCapacity && selCapacity !== "none") params.append("capacity", selCapacity);
          if (selInterface && selInterface !== "none") params.append("interface", selInterface);
        }

        if (selCategory === "CPU") {
          if (selSeries && selSeries !== "none") params.append("series", selSeries);
        }

        params.append("take", "50");

        const res = await fetch(`/api/assets?${params.toString()}`);
        const allAssets = await handleApiResponse(res);

        if (Array.isArray(allAssets)) {
          setAvailableComponents(allAssets);
        } else if (allAssets && Array.isArray(allAssets.data)) {
          setAvailableComponents(allAssets.data);
        } else {
          setAvailableComponents([]);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách linh kiện:", error);
        toast.error("Không thể tải danh sách linh kiện.");
        setAvailableComponents([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchAvailableComponents();
    }, 400);

    return () => clearTimeout(timer);
  }, [selCategory, selGeneration, selCapacity, selAttrType, selInterface, selSeries, searchQuery]);

  const onCategoryChange = (val: string) => {
    setSelCategory(val);
    setSelGeneration(""); setSelCapacity(""); setSelAttrType(""); setSelInterface(""); setSelSeries("");
    setSelectedComponentId(null);
  };

  // Xử lý khi bấm nút "Lắp ráp" (Giữ nguyên logic cũ)
  const handleAssemble = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComponentId) {
      toast.warning("Vui lòng chọn một linh kiện để lắp ráp.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/assets/${parentId}/assemble`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ componentId: selectedComponentId }),
      });

      await handleApiResponse(res, "Đã lắp ráp linh kiện thành công!");

      setSelectedComponentId(null);
      onRefresh(); // Báo cho trang cha tải lại
    } catch (error: any) {
      console.error("Lỗi khi thực hiện lắp ráp:", error);
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-inner flex flex-col gap-4">
      <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
        <Plus className="w-4 h-4 text-blue-600" />
        Thêm Linh kiện / Phụ kiện
      </p>

      {/* SEARCH AND FILTER STRIP */}
      <div className="flex flex-col gap-3 p-3 bg-white border border-slate-200 rounded-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Tìm theo Serial Number hoặc tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <div className="w-[140px] shrink-0">
            <Select value={selCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-9 font-medium bg-slate-50"><SelectValue placeholder="Danh mục" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả linh kiện</SelectItem>
                <SelectItem value="MEMORY">RAM</SelectItem>
                <SelectItem value="STORAGE">Ổ cứng</SelectItem>
                <SelectItem value="CPU">Vi xử lý CPU</SelectItem>
                <SelectItem value="GPU">Card dồ họa</SelectItem>
                <SelectItem value="NETWORK">Card mạng</SelectItem>
                <SelectItem value="COMPONENT">Component khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selCategory === "MEMORY" && (
            <>
              <Select value={selGeneration} onValueChange={setSelGeneration}>
                <SelectTrigger className="w-[120px] h-9 shrink-0"><SelectValue placeholder="Thế hệ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Tất cả --</SelectItem>
                  {getGenerations().map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Dung lượng..." value={selCapacity} onChange={e => setSelCapacity(e.target.value)} className="w-[110px] h-9 shrink-0 text-sm" />
            </>
          )}

          {selCategory === "STORAGE" && (
            <>
              <Select value={selAttrType} onValueChange={setSelAttrType}>
                <SelectTrigger className="w-[120px] h-9 shrink-0"><SelectValue placeholder="Loại" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Tất cả --</SelectItem>
                  {getStorageTypes().map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Dung lượng..." value={selCapacity} onChange={e => setSelCapacity(e.target.value)} className="w-[110px] h-9 shrink-0 text-sm" />
              <Select value={selInterface} onValueChange={setSelInterface}>
                <SelectTrigger className="w-[120px] h-9 shrink-0"><SelectValue placeholder="Giao tiếp" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Tất cả --</SelectItem>
                  {getStorageInterfaces().map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          )}

          {selCategory === "CPU" && (
            <Select value={selSeries} onValueChange={setSelSeries}>
              <SelectTrigger className="w-[140px] h-9 shrink-0"><SelectValue placeholder="Dòng (Series)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Tất cả --</SelectItem>
                {getCpuSeries().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500 italic flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách linh kiện...
        </div>
      ) : availableComponents.length === 0 ? (
        <div className="text-sm text-slate-500 italic">Không có linh kiện nào rảnh rỗi trong kho.</div>
      ) : (
        <form onSubmit={handleAssemble} className="flex flex-col sm:flex-row items-center gap-3">
          <Select
            value={selectedComponentId || ""}
            onValueChange={setSelectedComponentId}
          >
            <SelectTrigger className="flex-1 bg-white">
              <SelectValue placeholder="Chọn linh kiện để lắp vào..." />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-60">
              {availableComponents.map((comp) => (
                <SelectItem key={comp.id} value={comp.id}>
                  <div className="flex flex-col">
                    <span className="font-semibold">{comp.product?.name}</span>
                    <span className="text-xs text-slate-500 font-mono">SN: {comp.serialNumber}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="submit"
            disabled={!selectedComponentId || isSaving}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shrink-0"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Link className="w-4 h-4 mr-2" />
            )}
            {isSaving ? "Đang xử lý..." : "Lắp ráp"}
          </Button>
        </form>
      )}
    </div>
  );
}