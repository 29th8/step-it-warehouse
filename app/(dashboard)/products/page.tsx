"use client";

import React, { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Filter, Package, Search, Server, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreateProductModal } from "@/components/products/create-product-modal";
import { ProductActionMenu } from "@/components/products/product-action-menu";
import { ProductCategoryManager, type ProductCategoryOption } from "@/components/products/product-category-manager";
import { ProductAttributeManager } from "@/components/products/product-attribute-manager";
import type { ProductAttributeDefinition } from "@/components/products/product-attribute-fields";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

const PAGE_SIZE = 50;

type ProductListItem = {
  id: string;
  name: string;
  modelNumber: string;
  category: string;
  categoryName?: string;
  vendor?: string | null;
  _count?: { assets?: number };
};

type ProductListResponse = {
  data?: ProductListItem[];
  total?: number;
  totalPages?: number;
  error?: string;
};

function getApiError(json: unknown, fallback: string) {
  if (json && typeof json === "object" && "error" in json && typeof (json as { error?: unknown }).error === "string") {
    return (json as { error: string }).error;
  }
  return fallback;
}

export default function ProductListPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [attributeDefinitions, setAttributeDefinitions] = useState<ProductAttributeDefinition[]>([]);

  // Advanced Filter States
  const [selCategory, setSelCategory] = useState<string>("ALL");
  const [selVendor, setSelVendor] = useState<string>("");
  const [selGeneration, setSelGeneration] = useState<string>("");
  const [selCapacity, setSelCapacity] = useState<string>("");
  const [selAttrType, setSelAttrType] = useState<string>("");
  const [selInterface, setSelInterface] = useState<string>("");
  const [selSeries, setSelSeries] = useState<string>("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const fetchCategories = async () => {
    const res = await fetch("/api/product-categories");
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Không thể tải danh mục");
    setCategories(Array.isArray(json) ? json : json.data || []);
  };

  const fetchAttributeDefinitions = async () => {
    const res = await fetch("/api/product-attribute-definitions?activeOnly=true");
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Không thể tải cấu hình thuộc tính");
    setAttributeDefinitions(json.data || []);
  };

  useEffect(() => {
    fetchCategories().catch((error) => {
      const message = error instanceof Error ? error.message : "Không thể tải danh mục";
      setCategories([]);
      toast.error(message);
    });
    fetchAttributeDefinitions().catch(() => setAttributeDefinitions([]));
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const params = new URLSearchParams();
        params.append("page", String(page));
        params.append("pageSize", String(PAGE_SIZE));
        if (selCategory !== "ALL") params.append("category", selCategory);
        if (selVendor) params.append("vendor", selVendor);
        if (search) params.append("search", search);

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

        const res = await fetch(`/api/products?${params.toString()}`);
        const json: ProductListResponse | ProductListItem[] | null = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(getApiError(json, "Không thể tải danh sách sản phẩm"));
        }

        const nextProducts = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        setProducts(nextProducts);
        setTotal(Array.isArray(json) ? json.length : json?.total || 0);
        setTotalPages(Array.isArray(json) ? 1 : json?.totalPages || 1);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không thể tải danh sách sản phẩm";
        setLoadError(message);
        setProducts([]);
        setTotal(0);
        setTotalPages(1);
        toast.error(message);
      } finally { setLoading(false); }
    };

    const timer = setTimeout(() => {
      fetchProducts();
    }, 400);

    return () => clearTimeout(timer);
  }, [selCategory, selVendor, selGeneration, selCapacity, selAttrType, selInterface, selSeries, search, page, refreshTick]);

  useEffect(() => {
    setPage(1);
  }, [selCategory, selVendor, selGeneration, selCapacity, selAttrType, selInterface, selSeries, search]);

  const onCategoryChange = (val: string) => {
    setSelCategory(val);
    setSelGeneration(""); setSelCapacity(""); setSelAttrType(""); setSelInterface(""); setSelSeries("");
  };

  const clearFilters = () => {
    setSelCategory("ALL");
    setSelVendor("");
    setSelGeneration("");
    setSelCapacity("");
    setSelAttrType("");
    setSelInterface("");
    setSelSeries("");
    setSearch("");
    setPage(1);
  };

  // Triggers re-fetch while preserving current filters
  const refreshList = () => {
    setRefreshTick(t => t + 1);
  };

  const refreshCategories = () => {
    fetchCategories().catch((error) => {
      const message = error instanceof Error ? error.message : "Không thể tải danh mục";
      setCategories([]);
      toast.error(message);
    });
    fetchAttributeDefinitions().catch(() => setAttributeDefinitions([]));
    refreshList();
  };

  const refreshAttributes = () => {
    fetchAttributeDefinitions().catch(() => setAttributeDefinitions([]));
  };

  const filteredProducts = Array.isArray(products) ? products : []; // Already filtered globally by Server API

  const getCategoryBadge = (cat: string) => {
    const category = categories.find(c => c.code === cat);
    if (category?.isMain) return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-purple-100 text-purple-700 border-purple-200";
  };

  const getAttributeOptions = (key: string) => {
    const category = categories.find(c => c.code === selCategory);
    const definition = attributeDefinitions.find(d => d.categoryId === category?.id && d.key === key);
    return definition?.options?.filter(option => option.isActive !== false) || [];
  };

  const renderCategoryFilters = (variant: "desktop" | "sheet" = "desktop") => {
    const selectClassName = variant === "sheet" ? "h-11 w-full bg-white" : "w-[140px] bg-blue-50/50";
    const storageSelectClassName = variant === "sheet" ? "h-11 w-full bg-white" : "w-[140px] bg-emerald-50/50";
    const inputClassName = variant === "sheet" ? "h-11 w-full bg-white" : "bg-blue-50/50 border-blue-200 h-9 text-sm";
    const storageInputClassName = variant === "sheet" ? "h-11 w-full bg-white" : "bg-emerald-50/50 border-emerald-200 h-9 text-sm";

    if (selCategory === "MEMORY") {
      return (
        <>
          <Select value={selGeneration} onValueChange={setSelGeneration}>
            <SelectTrigger className={selectClassName}><SelectValue placeholder="Thế hệ RAM" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Tất cả --</SelectItem>
              {getAttributeOptions("generation").map(option => <SelectItem key={option.id} value={option.value}>{option.label || option.value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Dung lượng..."
            value={selCapacity}
            onChange={e => setSelCapacity(e.target.value)}
            className={inputClassName}
          />
        </>
      );
    }

    if (selCategory === "STORAGE") {
      return (
        <>
          <Select value={selAttrType} onValueChange={setSelAttrType}>
            <SelectTrigger className={storageSelectClassName}><SelectValue placeholder="Loại ổ cứng" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Tất cả --</SelectItem>
              {getAttributeOptions("type").map(option => <SelectItem key={option.id} value={option.value}>{option.label || option.value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Dung lượng..."
            value={selCapacity}
            onChange={e => setSelCapacity(e.target.value)}
            className={storageInputClassName}
          />
          <Select value={selInterface} onValueChange={setSelInterface}>
            <SelectTrigger className={storageSelectClassName}><SelectValue placeholder="Giao tiếp" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Tất cả --</SelectItem>
              {getAttributeOptions("interface").map(option => <SelectItem key={option.id} value={option.value}>{option.label || option.value}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      );
    }

    if (selCategory === "CPU") {
      return (
        <Select value={selSeries} onValueChange={setSelSeries}>
          <SelectTrigger className={variant === "sheet" ? "h-11 w-full bg-white" : "w-[160px] bg-purple-50/50"}><SelectValue placeholder="Dòng CPU (Series)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-- Tất cả --</SelectItem>
            {getAttributeOptions("series").map(option => <SelectItem key={option.id} value={option.value}>{option.label || option.value}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    return null;
  };

  return (
    <div className="p-3 sm:p-4 md:p-8 space-y-4 md:space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-4 md:pb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Package className="w-6 h-6 text-blue-600" /> Quản lý Sản phẩm</h1>
          <p className="text-sm text-slate-500 mt-1">Chuẩn hóa thông tin mẫu mã sản phẩm trước khi nhập kho.</p>
        </div>
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Tìm tên, model..." value={search} onChange={e => setSearch(e.target.value)} className="h-11 pl-9 bg-white md:h-9" />
          </div>
          <div className="flex w-full gap-2 overflow-x-auto pb-1 md:w-auto md:items-center md:overflow-visible md:pb-0">
            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-10 shrink-0 bg-white md:hidden">
                  <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                  Bộ lọc
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl bg-white p-0">
                <SheetHeader className="border-b bg-slate-50 pr-10">
                  <SheetTitle className="flex items-center gap-2 text-slate-900">
                    <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                    Bộ lọc sản phẩm
                  </SheetTitle>
                </SheetHeader>
                <div className="max-h-[calc(85vh-132px)] overflow-y-auto p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Danh mục</label>
                    <Select value={selCategory} onValueChange={onCategoryChange}>
                      <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Danh mục" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.code}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selCategory !== "ALL" && (
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <p className="text-sm font-bold text-slate-900">Thuộc tính lọc</p>
                      {renderCategoryFilters("sheet") || (
                        <p className="text-sm italic text-slate-400">Danh mục này chưa có bộ lọc riêng.</p>
                      )}
                    </div>
                  )}
                </div>
                <SheetFooter className="border-t bg-slate-50 pb-[max(env(safe-area-inset-bottom),1rem)]">
                  <Button type="button" variant="outline" onClick={clearFilters} className="bg-white">
                    <X className="h-4 w-4" />
                    Xóa lọc
                  </Button>
                  <Button type="button" onClick={() => setMobileFilterOpen(false)} className="bg-blue-600 text-white hover:bg-blue-700">
                    Áp dụng
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
          <ProductCategoryManager categories={categories} onRefresh={refreshCategories} />
          <ProductAttributeManager categories={categories} onRefresh={refreshAttributes} />
          <CreateProductModal categories={categories} attributeDefinitions={attributeDefinitions} onRefresh={refreshList} />
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="hidden md:flex bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 border-r pr-4">
          <Filter className="w-4 h-4" /> Bộ lọc
        </div>

        <div className="w-[180px]">
          <Select value={selCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Danh mục" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả danh mục</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.code}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* DYNAMIC CATEGORY FILTERS */}
        {renderCategoryFilters("desktop")}
        <Button type="button" variant="ghost" onClick={clearFilters} className="h-9 text-slate-500 hover:bg-red-50 hover:text-red-600">
          <X className="h-4 w-4" />
          Xóa lọc
        </Button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {loadError && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}
        <div className="md:hidden">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">Đang tải...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">Không tìm thấy sản phẩm.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <article key={product.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{product.name}</p>
                      <p className="mt-1 truncate font-mono text-xs text-slate-500">{product.modelNumber}</p>
                    </div>
                    <ProductActionMenu product={product} categories={categories} attributeDefinitions={attributeDefinitions} onRefresh={refreshList} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={getCategoryBadge(product.category)}>
                      {product.categoryName || categories.find(c => c.code === product.category)?.name || product.category}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                      <Server className="w-3 h-3" />
                      {product._count?.assets || 0}
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-500">Hãng sản xuất: </span>
                    <span className="font-semibold text-slate-800">{product.vendor || "Chưa cập nhật"}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="hidden md:block">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[300px] font-bold">Tên Sản phẩm / Model</TableHead>
              <TableHead className="font-bold">Sản phẩm</TableHead>
              <TableHead className="font-bold">Hãng sản xuất</TableHead>
              <TableHead className="font-bold text-center">Tồn kho</TableHead>
              <TableHead className="text-right font-bold w-[100px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={5} className="text-center py-10">Đang tải...</TableCell></TableRow> :
              filteredProducts.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">Không tìm thấy sản phẩm.</TableCell></TableRow> :
                filteredProducts.map(product => (
                  <TableRow key={product.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <p className="font-bold text-slate-800">{product.name}</p>
                      <p className="font-mono text-xs text-slate-500 mt-0.5">{product.modelNumber}</p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getCategoryBadge(product.category)}
                      >
                        {product.categoryName || categories.find(c => c.code === product.category)?.name || product.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium">{product.vendor}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 gap-1"><Server className="w-3 h-3" /> {product._count?.assets || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right"><ProductActionMenu product={product} categories={categories} attributeDefinitions={attributeDefinitions} onRefresh={refreshList} /></TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white border rounded-xl px-4 py-3 shadow-sm">
          <p className="text-sm text-slate-500">
            Trang <strong>{page}</strong> / {totalPages} · Tổng <strong>{total}</strong> sản phẩm
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1 || loading}>«</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>‹</Button>
            <span className="text-sm font-medium px-2">{page}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>›</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages || loading}>»</Button>
          </div>
        </div>
      )}
    </div>
  );
}
