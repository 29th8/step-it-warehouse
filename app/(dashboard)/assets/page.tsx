"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Filter, Package, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssetTable } from "@/components/inventory/asset-table";
import { CreateAssetModal } from "@/components/inventory/create-asset-modal";
import { ImportAssetModal } from "@/components/inventory/import-asset-modal";
import type { ProductCategoryOption } from "@/components/products/product-category-manager";
import type { ProductAttributeDefinition } from "@/components/products/product-attribute-fields";

const PAGE_SIZE = 50;

type AssetResponse = {
  data?: any[];
  total?: number;
  totalPages?: number;
};

function parseList(json: any) {
  return Array.isArray(json) ? json : json?.data || [];
}

export default function AssetListPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [attributeDefinitions, setAttributeDefinitions] = useState<ProductAttributeDefinition[]>([]);
  const [activeCategory, setActiveCategory] = useState("");

  const [assets, setAssets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string>>({});

  const selectedCategory = useMemo(
    () => categories.find((category) => category.code === activeCategory),
    [categories, activeCategory]
  );

  const selectedDefinitions = useMemo(
    () => attributeDefinitions
      .filter((definition) => definition.categoryId === selectedCategory?.id && definition.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [attributeDefinitions, selectedCategory?.id]
  );

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [categoriesRes, definitionsRes] = await Promise.all([
          fetch("/api/product-categories"),
          fetch("/api/product-attribute-definitions?activeOnly=true"),
        ]);
        const categoriesJson = await categoriesRes.json().catch(() => null);
        const definitionsJson = await definitionsRes.json().catch(() => null);
        const nextCategories = parseList(categoriesJson);
        setCategories(nextCategories);
        setAttributeDefinitions(parseList(definitionsJson));
        setActiveCategory((current) => current || nextCategories[0]?.code || "");
      } catch (error) {
        toast.error("Không thể tải danh mục thiết bị");
        setCategories([]);
        setAttributeDefinitions([]);
      }
    };

    loadMeta();
  }, []);

  const buildParams = useCallback((targetPage: number) => {
    const params = new URLSearchParams();
    params.append("pageSize", String(PAGE_SIZE));
    params.append("page", String(targetPage));

    if (activeCategory) params.append("category", activeCategory);
    if (searchQuery) params.append("search", searchQuery);
    if (ownerFilter) params.append("owner", ownerFilter);
    if (filterStatus !== "ALL") params.append("status", filterStatus);

    for (const definition of selectedDefinitions) {
      const value = attributeFilters[definition.key];
      if (!value || value === "none") continue;
      if (definition.inputType === "SELECT" || definition.inputType === "BOOLEAN") {
        params.append(`attr_${definition.key}`, value);
      } else {
        params.append(`attrLike_${definition.key}`, value);
      }
    }

    return params;
  }, [activeCategory, searchQuery, ownerFilter, filterStatus, selectedDefinitions, attributeFilters]);

  const fetchAssets = useCallback(async (targetPage = page) => {
    if (!activeCategory) {
      setAssets([]);
      setTotal(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/assets?${buildParams(targetPage).toString()}`);
      const json: AssetResponse | any[] = await res.json();
      if (!res.ok) throw new Error((json as any)?.error || "Không thể tải thiết bị");

      const isArray = Array.isArray(json);
      setAssets(isArray ? json : json.data || []);
      setTotal(isArray ? json.length : json.total || 0);
      setTotalPages(isArray ? 1 : json.totalPages || 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải thiết bị");
      setAssets([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, buildParams, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchAssets(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [activeCategory, searchQuery, ownerFilter, filterStatus, attributeFilters, selectedDefinitions]);

  useEffect(() => {
    fetchAssets(page);
  }, [page]);

  const refreshAll = () => fetchAssets(page);

  const handleCategoryChange = (categoryCode: string) => {
    setActiveCategory(categoryCode);
    setAttributeFilters({});
    setPage(1);
  };

  const setAttributeFilter = (key: string, value: string) => {
    setAttributeFilters((prev) => ({ ...prev, [key]: value }));
  };

  const renderAttributeFilter = (definition: ProductAttributeDefinition) => {
    const value = attributeFilters[definition.key] || "";

    if (definition.inputType === "SELECT" || definition.inputType === "BOOLEAN") {
      const options = definition.inputType === "BOOLEAN"
        ? [
          { id: "true", value: "true", label: "Có" },
          { id: "false", value: "false", label: "Không" },
        ]
        : definition.options.filter((option) => option.isActive !== false);

      return (
        <Select key={definition.id} value={value || "none"} onValueChange={(next) => setAttributeFilter(definition.key, next)}>
          <SelectTrigger className="w-[160px] h-9 bg-slate-50 border-slate-200 shrink-0">
            <SelectValue placeholder={definition.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-- {definition.label} --</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.label || option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        key={definition.id}
        placeholder={definition.label}
        value={value}
        type={definition.inputType === "NUMBER" ? "number" : "text"}
        onChange={(event) => setAttributeFilter(definition.key, event.target.value)}
        className="w-[160px] h-9 bg-slate-50 border-slate-200 shrink-0 text-sm"
      />
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900 tracking-tight">
            <div className="p-2 bg-blue-100/50 text-blue-600 rounded-xl border border-blue-200/50 shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            Quản lý Thiết bị
          </h1>
          <p className="text-slate-500 font-medium ml-1 mt-1">
            {selectedCategory?.name || "Danh mục"}: <strong className="text-blue-600 text-base">{total}</strong> thiết bị.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              placeholder="Tìm Serial Number, Tên thiết bị..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10 h-11 w-full bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-1 focus-visible:ring-blue-500 transition-all hover:border-slate-300 text-base"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-11 w-full sm:w-[200px] bg-white border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors font-medium">
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="w-4 h-4 text-slate-500 shrink-0" />
                    <SelectValue placeholder="Trạng thái" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-lg border-slate-200">
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="WAREHOUSE_STOCK">Trong kho vật lý</SelectItem>
                  <SelectItem value="AVAILABLE_STOCK">Rời / khả dụng</SelectItem>
                  <SelectItem value="INSTALLED">Đã lắp trong server</SelectItem>
                  <SelectItem value="DEPLOYED">Đang sử dụng</SelectItem>
                  <SelectItem value="HANDED_OVER">Đã bàn giao</SelectItem>
                  <SelectItem value="MAINTENANCE">Bảo trì</SelectItem>
                  <SelectItem value="RENTED">Đang thuê</SelectItem>
                  <SelectItem value="FAULTY">Lỗi hỏng</SelectItem>
                  <SelectItem value="DISPOSED">Thanh lý</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={refreshAll}
                disabled={loading}
                className="h-11 w-11 shrink-0 bg-white border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin" : ""}`} />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/assets/recycle-bin")}
                className="h-11 w-11 shrink-0 bg-white border-slate-200 rounded-xl shadow-sm hover:bg-red-50 transition-all"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              <ImportAssetModal onRefresh={refreshAll} />
              <Button
                variant="outline"
                className="bg-white border-slate-200 hover:bg-slate-50 shadow-sm text-slate-700 h-10 whitespace-nowrap"
                onClick={() => window.open("/api/assets/export/report", "_blank")}
              >
                <Download className="w-4 h-4 mr-2 text-green-600 shrink-0" />
                Export
              </Button>
              <div className="w-[1px] h-6 bg-slate-200 mx-1 hidden sm:block" />
              <div className="shrink-0">
                <CreateAssetModal onRefresh={refreshAll} />
              </div>
            </div>
          </div>

          <div className="flex bg-white p-3 rounded-xl border border-slate-200 shadow-sm gap-3 overflow-x-auto">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 shrink-0 border-r border-slate-200 pr-3">
              <Filter className="w-4 h-4 text-blue-600" />
              Lọc {selectedCategory?.name || "danh mục"}
            </div>

            {selectedDefinitions.length > 0 ? (
              selectedDefinitions.map(renderAttributeFilter)
            ) : (
              <span className="text-sm text-slate-400 italic py-2 shrink-0">Danh mục này chưa có thuộc tính lọc.</span>
            )}

            <div className="w-[1px] h-6 bg-slate-200 shrink-0" />
            <Input
              placeholder="Lọc theo chủ sở hữu..."
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
              className="w-[180px] h-9 bg-yellow-50/50 border-yellow-200 text-sm placeholder:text-yellow-600/60 shrink-0"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="w-full">
        <TabsList className="inline-flex h-auto max-w-full overflow-x-auto p-1 bg-slate-100/80 rounded-lg mb-6 border border-slate-200/60">
          {categories.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.code}
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all font-medium whitespace-nowrap"
            >
              <span>{category.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.code} className="focus-visible:outline-none focus-visible:ring-0 mt-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <AssetTable data={assets} loading={loading} onRefresh={refreshAll} />
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white border rounded-xl px-4 py-3 shadow-sm mt-3">
                <p className="text-sm text-slate-500">Trang <strong>{page}</strong> / {totalPages} · Tổng <strong>{total}</strong></p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>«</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</Button>
                  <span className="text-sm font-medium px-2">{page}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</Button>
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
