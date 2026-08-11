"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Filter, Package, RefreshCw, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AssetTable, type AssetTableRow } from "@/components/inventory/asset-table";
import { CreateAssetModal } from "@/components/inventory/create-asset-modal";
import { ImportAssetModal } from "@/components/inventory/import-asset-modal";
import type { ProductCategoryOption } from "@/components/products/product-category-manager";
import type { ProductAttributeDefinition } from "@/components/products/product-attribute-fields";

const PAGE_SIZE = 50;
const SERVER_PRIMARY_FILTER_KEYS = ["uHeight", "dimmSlots", "driveBays"];
const DEFAULT_PRIMARY_FILTER_LIMIT = 4;

type AssetResponse = {
  data?: AssetTableRow[];
  total?: number;
  totalPages?: number;
  error?: string;
};

type CategoryCountsResponse = {
  data?: Record<string, number>;
};

type AttributeValuesResponse = {
  data?: string[];
};

function parseList<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === "object" && "data" in json && Array.isArray((json as { data?: unknown }).data)) {
    return (json as { data: T[] }).data;
  }
  return [];
}

function getApiError(json: unknown, fallback: string) {
  if (json && typeof json === "object" && "error" in json && typeof (json as { error?: unknown }).error === "string") {
    return (json as { error: string }).error;
  }
  return fallback;
}

export default function AssetListPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [attributeDefinitions, setAttributeDefinitions] = useState<ProductAttributeDefinition[]>([]);
  const [activeCategory, setActiveCategory] = useState("");

  const [assets, setAssets] = useState<AssetTableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [categorySearch, setCategorySearch] = useState("");

  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string>>({});
  const [ramSpeedOptions, setRamSpeedOptions] = useState<string[]>([]);
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

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

  const primaryDefinitions = useMemo(() => {
    if (activeCategory === "SERVER") {
      return selectedDefinitions.filter((definition) => SERVER_PRIMARY_FILTER_KEYS.includes(definition.key));
    }
    return selectedDefinitions.slice(0, DEFAULT_PRIMARY_FILTER_LIMIT);
  }, [activeCategory, selectedDefinitions]);

  const advancedDefinitions = useMemo(() => {
    const primaryKeys = new Set(primaryDefinitions.map((definition) => definition.key));
    return selectedDefinitions.filter((definition) => !primaryKeys.has(definition.key));
  }, [primaryDefinitions, selectedDefinitions]);

  const activeAdvancedFilterCount = useMemo(() => {
    return advancedDefinitions.filter((definition) => {
      const value = attributeFilters[definition.key];
      return value && value !== "none";
    }).length;
  }, [advancedDefinitions, attributeFilters]);

  const filteredCategories = useMemo(() => {
    const keyword = categorySearch.trim().toLowerCase();
    if (!keyword) return categories;
    return categories.filter((category) => {
      return category.name.toLowerCase().includes(keyword) || category.code.toLowerCase().includes(keyword);
    });
  }, [categories, categorySearch]);

  const assetFilterSignature = useMemo(() => {
    return JSON.stringify({
      activeCategory,
      searchQuery,
      ownerFilter,
      filterStatus,
      attributeFilters,
      definitionIds: selectedDefinitions.map((definition) => definition.id),
    });
  }, [activeCategory, searchQuery, ownerFilter, filterStatus, attributeFilters, selectedDefinitions]);

  const lastAssetFilterSignature = useRef(assetFilterSignature);

  const fetchRamSpeedOptions = useCallback(async () => {
    const params = new URLSearchParams({
      attributeValues: "true",
      category: "MEMORY",
      attributeKey: "speed",
    });
    const res = await fetch(`/api/assets?${params.toString()}`, { cache: "no-store" });
    const json: AttributeValuesResponse = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(getApiError(json, "Không thể tải danh sách tốc độ RAM"));
    setRamSpeedOptions(Array.isArray(json.data) ? json.data : []);
  }, []);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [categoriesRes, definitionsRes] = await Promise.all([
          fetch("/api/product-categories"),
          fetch("/api/product-attribute-definitions?activeOnly=true"),
        ]);
        const categoriesJson = await categoriesRes.json().catch(() => null);
        const definitionsJson = await definitionsRes.json().catch(() => null);
        const nextCategories = parseList<ProductCategoryOption>(categoriesJson);
        setCategories(nextCategories);
        setAttributeDefinitions(parseList<ProductAttributeDefinition>(definitionsJson));
        setActiveCategory((current) => current || nextCategories[0]?.code || "");
      } catch {
        toast.error("Không thể tải danh mục thiết bị");
        setCategories([]);
        setAttributeDefinitions([]);
      }
    };

    loadMeta();
  }, []);

  useEffect(() => {
    if (activeCategory !== "MEMORY") return;
    fetchRamSpeedOptions().catch(() => setRamSpeedOptions([]));
  }, [activeCategory, fetchRamSpeedOptions]);

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
      const forceExactMatch = activeCategory === "MEMORY" && definition.key === "speed";
      if (forceExactMatch || definition.inputType === "SELECT" || definition.inputType === "BOOLEAN" || definition.inputType === "NUMBER") {
        params.append(`attr_${definition.key}`, value);
      } else {
        params.append(`attrLike_${definition.key}`, value);
      }
    }

    return params;
  }, [activeCategory, searchQuery, ownerFilter, filterStatus, selectedDefinitions, attributeFilters]);

  const buildCategoryCountParams = useCallback(() => {
    const params = new URLSearchParams();
    params.append("categoryCounts", "true");

    if (searchQuery) params.append("search", searchQuery);
    if (ownerFilter) params.append("owner", ownerFilter);
    if (filterStatus !== "ALL") params.append("status", filterStatus);

    return params;
  }, [searchQuery, ownerFilter, filterStatus]);

  const fetchAssets = useCallback(async (targetPage: number) => {
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
      const json: AssetResponse | AssetTableRow[] = await res.json();
      if (!res.ok) throw new Error(getApiError(json, "Không thể tải thiết bị"));

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
  }, [activeCategory, buildParams]);

  const fetchCategoryCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets?${buildCategoryCountParams().toString()}`);
      const json: CategoryCountsResponse = await res.json();
      if (!res.ok) throw new Error(getApiError(json, "Không thể tải số lượng danh mục"));
      setCategoryCounts(json.data || {});
    } catch {
      setCategoryCounts({});
    }
  }, [buildCategoryCountParams]);

  useEffect(() => {
    const filterChanged = lastAssetFilterSignature.current !== assetFilterSignature;
    lastAssetFilterSignature.current = assetFilterSignature;

    if (filterChanged && page !== 1) {
      setPage(1);
      return;
    }

    const targetPage = filterChanged ? 1 : page;
    const timer = setTimeout(() => {
      fetchAssets(targetPage);
    }, 350);
    return () => clearTimeout(timer);
  }, [assetFilterSignature, page, fetchAssets]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategoryCounts();
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchCategoryCounts]);

  const refreshAll = () => {
    fetchAssets(page);
    fetchCategoryCounts();
    if (activeCategory === "MEMORY") {
      fetchRamSpeedOptions().catch(() => setRamSpeedOptions([]));
    }
  };

  const handleCategoryChange = (categoryCode: string) => {
    setActiveCategory(categoryCode);
    setAttributeFilters({});
    setPage(1);
  };

  const setAttributeFilter = (key: string, value: string) => {
    setAttributeFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAdvancedFilters = () => {
    setAttributeFilters((prev) => {
      const next = { ...prev };
      for (const definition of advancedDefinitions) {
        delete next[definition.key];
      }
      return next;
    });
  };

  const clearAllFilters = () => {
    setFilterStatus("ALL");
    setOwnerFilter("");
    setSearchQuery("");
    setAttributeFilters({});
    setPage(1);
  };

  const renderAttributeFilter = (definition: ProductAttributeDefinition, variant: "compact" | "sheet" = "compact") => {
    const value = attributeFilters[definition.key] || "";
    const wrapperClassName = variant === "sheet" ? "space-y-2" : "";
    const controlClassName = variant === "sheet"
      ? "w-full h-10 bg-white border-slate-200"
      : "w-[160px] h-9 bg-slate-50 border-slate-200 shrink-0";

    if (activeCategory === "MEMORY" && definition.key === "speed") {
      return (
        <div key={definition.id} className={wrapperClassName}>
          {variant === "sheet" && <label className="text-sm font-medium text-slate-700">{definition.label}</label>}
          <Select value={value || "none"} onValueChange={(next) => setAttributeFilter(definition.key, next)}>
            <SelectTrigger className={controlClassName}>
              <SelectValue placeholder={definition.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- {definition.label} --</SelectItem>
              {ramSpeedOptions.map((speed) => (
                <SelectItem key={speed.toLocaleLowerCase("vi")} value={speed}>
                  {speed}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (definition.inputType === "SELECT" || definition.inputType === "BOOLEAN") {
      const options = definition.inputType === "BOOLEAN"
        ? [
          { id: "true", value: "true", label: "Có" },
          { id: "false", value: "false", label: "Không" },
        ]
        : definition.options.filter((option) => option.isActive !== false);

      return (
        <div key={definition.id} className={wrapperClassName}>
          {variant === "sheet" && <label className="text-sm font-medium text-slate-700">{definition.label}</label>}
          <Select value={value || "none"} onValueChange={(next) => setAttributeFilter(definition.key, next)}>
            <SelectTrigger className={controlClassName}>
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
        </div>
      );
    }

    return (
      <div key={definition.id} className={wrapperClassName}>
        {variant === "sheet" && <label className="text-sm font-medium text-slate-700">{definition.label}</label>}
        <Input
          placeholder={definition.label}
          value={value}
          type={definition.inputType === "NUMBER" ? "number" : "text"}
          min={definition.inputType === "NUMBER" ? 1 : undefined}
          step={definition.inputType === "NUMBER" ? 1 : undefined}
          onChange={(event) => setAttributeFilter(definition.key, event.target.value)}
          className={`${controlClassName} text-sm`}
        />
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-4 md:p-8 space-y-4 md:space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 md:gap-6 md:mb-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3 text-slate-900 tracking-tight">
            <div className="p-2 bg-blue-100/50 text-blue-600 rounded-lg md:rounded-xl border border-blue-200/50 shadow-sm">
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

          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-11 flex-1 justify-center rounded-xl bg-white shadow-sm">
                  <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                  Bộ lọc
                  {(filterStatus !== "ALL" || ownerFilter || Object.values(attributeFilters).some(Boolean)) && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">Đang lọc</span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[88vh] rounded-t-2xl bg-white p-0">
                <SheetHeader className="border-b bg-slate-50 pr-10">
                  <SheetTitle className="flex items-center gap-2 text-slate-900">
                    <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                    Bộ lọc thiết bị
                  </SheetTitle>
                </SheetHeader>
                <div className="max-h-[calc(88vh-132px)] overflow-y-auto p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Danh mục</label>
                    <Select value={activeCategory} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="h-11 w-full bg-white">
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.code}>
                            {category.name} ({categoryCounts[category.code] || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Trạng thái</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-11 w-full bg-white">
                        <SelectValue placeholder="Trạng thái" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
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
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Chủ sở hữu</label>
                    <Input
                      value={ownerFilter}
                      onChange={(event) => setOwnerFilter(event.target.value)}
                      placeholder="Lọc theo chủ sở hữu..."
                      className="h-11 bg-white"
                    />
                  </div>

                  {selectedDefinitions.length > 0 && (
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <p className="text-sm font-bold text-slate-900">Thuộc tính {selectedCategory?.name}</p>
                      {selectedDefinitions.map((definition) => renderAttributeFilter(definition, "sheet"))}
                    </div>
                  )}
                </div>
                <SheetFooter className="border-t bg-slate-50 pb-[max(env(safe-area-inset-bottom),1rem)]">
                  <Button type="button" variant="outline" onClick={clearAllFilters} className="bg-white">
                    <X className="h-4 w-4" />
                    Xóa lọc
                  </Button>
                  <Button type="button" onClick={() => setMobileFilterOpen(false)} className="bg-blue-600 text-white hover:bg-blue-700">
                    Áp dụng
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <Button
              variant="outline"
              size="icon"
              onClick={refreshAll}
              disabled={loading}
              className="h-11 w-11 shrink-0 rounded-xl bg-white shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? "animate-spin" : ""}`} />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/assets/recycle-bin")}
              className="h-11 w-11 shrink-0 rounded-xl bg-white shadow-sm"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
            <ImportAssetModal onRefresh={refreshAll} />
            <Button
              variant="outline"
              className="h-10 shrink-0 bg-white shadow-sm"
              onClick={() => window.open("/api/assets/export/report", "_blank")}
            >
              <Download className="w-4 h-4 text-green-600" />
              Export
            </Button>
            <CreateAssetModal onRefresh={refreshAll} />
          </div>

          <div className="hidden md:flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
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

          <div className="hidden md:flex flex-wrap items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 shrink-0 border-r border-slate-200 pr-3">
              <Filter className="w-4 h-4 text-blue-600" />
              Lọc {selectedCategory?.name || "danh mục"}
            </div>

            {primaryDefinitions.length > 0 ? (
              primaryDefinitions.map((definition) => renderAttributeFilter(definition))
            ) : (
              <span className="text-sm text-slate-400 italic py-2 shrink-0">Danh mục này chưa có thuộc tính lọc.</span>
            )}

            {advancedDefinitions.length > 0 && (
              <Sheet open={advancedFilterOpen} onOpenChange={setAdvancedFilterOpen}>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0"
                  >
                    <SlidersHorizontal className="w-4 h-4 mr-2 text-blue-600" />
                    Bộ lọc nâng cao
                    {activeAdvancedFilterCount > 0 && (
                      <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                        {activeAdvancedFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-white sm:max-w-[460px] gap-0">
                  <SheetHeader className="border-b bg-slate-50 pr-10">
                    <SheetTitle className="flex items-center gap-2 text-slate-900">
                      <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                      Bộ lọc nâng cao
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {advancedDefinitions.map((definition) => renderAttributeFilter(definition, "sheet"))}
                  </div>
                  <SheetFooter className="border-t bg-slate-50 sm:flex-row sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearAdvancedFilters}
                      disabled={activeAdvancedFilterCount === 0}
                      className="bg-white"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Xóa nâng cao
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setAdvancedFilterOpen(false)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Áp dụng
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            )}

            <div className="w-[1px] h-6 bg-slate-200 shrink-0" />
            <Input
              placeholder="Lọc theo chủ sở hữu..."
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
              className="w-[180px] h-9 bg-yellow-50/50 border-yellow-200 text-sm placeholder:text-yellow-600/60 shrink-0"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={clearAllFilters}
              className="h-9 px-3 text-slate-500 hover:text-red-600 hover:bg-red-50 shrink-0"
            >
              <X className="w-4 h-4 mr-1.5" />
              Xóa lọc
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="hidden h-fit overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Danh mục</p>
                <p className="text-xs text-slate-400">{categories.length} nhóm thiết bị</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                {Object.values(categoryCounts).reduce((sum, value) => sum + value, 0)}
              </span>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Tìm danh mục..."
                className="h-9 rounded-lg border-slate-200 bg-slate-50 pl-9 text-sm"
              />
            </div>
          </div>

          <nav className="max-h-[520px] overflow-y-auto p-2">
            {filteredCategories.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-slate-400">Không tìm thấy danh mục.</div>
            ) : (
              filteredCategories.map((category) => {
                const isActive = category.code === activeCategory;
                const count = categoryCounts[category.code] || 0;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryChange(category.code)}
                    className={`group flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${isActive
                      ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{category.name}</span>
                      <span className={`block text-xs ${isActive ? "text-blue-500" : "text-slate-400"}`}>{category.code}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-white"}`}>
                      {count}
                    </span>
                  </button>
                );
              })
            )}
          </nav>
        </aside>

        <section className="min-w-0 space-y-3">
          <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900">{selectedCategory?.name || "Danh mục"}</p>
              <p className="text-xs text-slate-400">{selectedCategory?.code || ""}</p>
            </div>
            <p className="text-sm text-slate-500">
              Tổng <strong className="text-blue-600">{total}</strong> thiết bị
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
        </section>
      </div>
    </div>
  );
}
