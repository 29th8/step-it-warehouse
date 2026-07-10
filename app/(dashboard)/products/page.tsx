"use client";

import React, { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Search, Server } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CreateProductModal } from "@/components/products/create-product-modal";
import { ProductActionMenu } from "@/components/products/product-action-menu";
import { ProductCategoryManager, type ProductCategoryOption } from "@/components/products/product-category-manager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { toast } from "sonner";
import {
  getGenerations,
  getStorageTypes,
  getStorageInterfaces,
  getCpuSeries
} from "@/lib/product-options";

export default function ProductListPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);

  // Advanced Filter States
  const [selCategory, setSelCategory] = useState<string>("ALL");
  const [selVendor, setSelVendor] = useState<string>("");
  const [selGeneration, setSelGeneration] = useState<string>("");
  const [selCapacity, setSelCapacity] = useState<string>("");
  const [selAttrType, setSelAttrType] = useState<string>("");
  const [selInterface, setSelInterface] = useState<string>("");
  const [selSeries, setSelSeries] = useState<string>("");
  const [refreshTick, setRefreshTick] = useState(0);

  const fetchCategories = async () => {
    const res = await fetch("/api/product-categories");
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Không thể tải danh mục");
    setCategories(Array.isArray(json) ? json : json.data || []);
  };

  useEffect(() => {
    fetchCategories().catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const params = new URLSearchParams();
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

        params.append("take", "50");

        const res = await fetch(`/api/products?${params.toString()}`);
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error || "Không thể tải danh sách sản phẩm");
        }

        const nextProducts = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        setProducts(nextProducts);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không thể tải danh sách sản phẩm";
        setLoadError(message);
        setProducts([]);
        toast.error(message);
      } finally { setLoading(false); }
    };

    const timer = setTimeout(() => {
      fetchProducts();
    }, 400);

    return () => clearTimeout(timer);
  }, [selCategory, selVendor, selGeneration, selCapacity, selAttrType, selInterface, selSeries, search, refreshTick]);

  const onCategoryChange = (val: string) => {
    setSelCategory(val);
    setSelGeneration(""); setSelCapacity(""); setSelAttrType(""); setSelInterface(""); setSelSeries("");
  };

  // Triggers re-fetch while preserving current filters
  const refreshList = () => {
    setRefreshTick(t => t + 1);
  };

  const refreshCategories = () => {
    fetchCategories().catch(() => setCategories([]));
    refreshList();
  };

  const filteredProducts = Array.isArray(products) ? products : []; // Already filtered globally by Server API

  const getCategoryBadge = (cat: string) => {
    const category = categories.find(c => c.code === cat);
    if (category?.isMain) return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-purple-100 text-purple-700 border-purple-200";
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Package className="w-6 h-6 text-blue-600" /> Quản lý Sản phẩm</h1>
          <p className="text-sm text-slate-500 mt-1">Chuẩn hóa thông tin mẫu mã sản phẩm trước khi nhập kho.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Tìm tên, model..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white" />
          </div>
          <ProductCategoryManager categories={categories} onRefresh={refreshCategories} />
          <CreateProductModal categories={categories} onRefresh={refreshList} />
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
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
        {selCategory === "MEMORY" && (
          <>
            <Select value={selGeneration} onValueChange={setSelGeneration}>
              <SelectTrigger className="w-[140px] bg-blue-50/50"><SelectValue placeholder="Thế hệ RAM" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Tất cả --</SelectItem>
                {getGenerations().map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative w-[140px]">
              <Input
                placeholder="Dung lượng..."
                value={selCapacity}
                onChange={e => setSelCapacity(e.target.value)}
                className="bg-blue-50/50 border-blue-200 h-9 text-sm"
              />
            </div>
          </>
        )}

        {selCategory === "STORAGE" && (
          <>
            <Select value={selAttrType} onValueChange={setSelAttrType}>
              <SelectTrigger className="w-[140px] bg-emerald-50/50"><SelectValue placeholder="Loại ổ cứng" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Tất cả --</SelectItem>
                {getStorageTypes().map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative w-[140px]">
              <Input
                placeholder="Dung lượng..."
                value={selCapacity}
                onChange={e => setSelCapacity(e.target.value)}
                className="bg-emerald-50/50 border-emerald-200 h-9 text-sm"
              />
            </div>
            <Select value={selInterface} onValueChange={setSelInterface}>
              <SelectTrigger className="w-[140px] bg-emerald-50/50"><SelectValue placeholder="Giao tiếp" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Tất cả --</SelectItem>
                {getStorageInterfaces().map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}

        {selCategory === "CPU" && (
          <Select value={selSeries} onValueChange={setSelSeries}>
            <SelectTrigger className="w-[160px] bg-purple-50/50"><SelectValue placeholder="Dòng CPU (Series)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Tất cả --</SelectItem>
              {getCpuSeries().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {loadError && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}
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
                    <TableCell className="text-right"><ProductActionMenu product={product} categories={categories} onRefresh={refreshList} /></TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
