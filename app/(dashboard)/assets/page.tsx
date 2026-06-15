"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssetTable } from "@/components/inventory/asset-table";
import { Package, Filter, RefreshCw, Search, Server, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateAssetModal } from "@/components/inventory/create-asset-modal";
import { ImportAssetModal } from "@/components/inventory/import-asset-modal";
import { Download } from "lucide-react";
import { Trash2 } from "lucide-react";
import {
  getGenerations,
  getStorageTypes,
  getStorageInterfaces,
  getCpuSeries
} from "@/lib/product-options";

const MAIN_CATEGORIES = ["SERVER", "NETWORK"];
const COMP_CATEGORIES = ["COMPONENT", "ACCESSORY", "STORAGE", 'CPU', 'GPU', 'MEMORY'];

const PAGE_SIZE = 50;

function buildCommonParams(
  selCategory: string, selVendor: string, searchQuery: string, ownerFilter: string,
  filterStatus: string, selGeneration: string, selCapacity: string,
  selAttrType: string, selInterface: string, selSeries: string
) {
  const params = new URLSearchParams();
  if (selVendor) params.append("vendor", selVendor);
  if (searchQuery) params.append("search", searchQuery);
  if (ownerFilter) params.append("owner", ownerFilter);
  if (filterStatus !== "ALL") params.append("status", filterStatus);
  if (selCategory !== "ALL") params.append("category", selCategory);
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
  params.append("pageSize", String(PAGE_SIZE));
  return params;
}

export default function AssetListPage() {
  const router = useRouter();

  // Filters
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("main");
  const [selCategory, setSelCategory] = useState<string>("ALL");
  const [selVendor, setSelVendor] = useState<string>("");
  const [selGeneration, setSelGeneration] = useState<string>("");
  const [selCapacity, setSelCapacity] = useState<string>("");
  const [selAttrType, setSelAttrType] = useState<string>("");
  const [selInterface, setSelInterface] = useState<string>("");
  const [selSeries, setSelSeries] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState<string>("");

  // Main tab state
  const [mainAssets, setMainAssets] = useState<any[]>([]);
  const [mainTotal, setMainTotal] = useState(0);
  const [mainTotalPages, setMainTotalPages] = useState(1);
  const [mainPage, setMainPage] = useState(1);
  const [mainLoading, setMainLoading] = useState(true);

  // Component tab state
  const [compAssets, setCompAssets] = useState<any[]>([]);
  const [compTotal, setCompTotal] = useState(0);
  const [compTotalPages, setCompTotalPages] = useState(1);
  const [compPage, setCompPage] = useState(1);
  const [compLoading, setCompLoading] = useState(true);

  const commonArgs = [selCategory, selVendor, searchQuery, ownerFilter, filterStatus, selGeneration, selCapacity, selAttrType, selInterface, selSeries] as const;

  const fetchMain = useCallback((p = 1) => {
    setMainLoading(true);
    const params = buildCommonParams(...commonArgs);
    if (selCategory === "ALL") params.append("tabFilter", "main");
    params.append("page", String(p));
    fetch(`/api/assets?${params}`)
      .then(r => r.json())
      .then(j => {
        const isArr = Array.isArray(j);
        setMainAssets(isArr ? j : j.data || []);
        setMainTotal(isArr ? j.length : j.total || 0);
        setMainTotalPages(isArr ? 1 : j.totalPages || 1);
      })
      .catch(() => setMainAssets([]))
      .finally(() => setMainLoading(false));
  }, [...commonArgs]);

  const fetchComp = useCallback((p = 1) => {
    setCompLoading(true);
    const params = buildCommonParams(...commonArgs);
    if (selCategory === "ALL") params.append("tabFilter", "component");
    params.append("page", String(p));
    fetch(`/api/assets?${params}`)
      .then(r => r.json())
      .then(j => {
        const isArr = Array.isArray(j);
        setCompAssets(isArr ? j : j.data || []);
        setCompTotal(isArr ? j.length : j.total || 0);
        setCompTotalPages(isArr ? 1 : j.totalPages || 1);
      })
      .catch(() => setCompAssets([]))
      .finally(() => setCompLoading(false));
  }, [...commonArgs]);

  // Reset pages + refetch both on filter change
  useEffect(() => {
    const t = setTimeout(() => {
      setMainPage(1); setCompPage(1);
      fetchMain(1); fetchComp(1);
    }, 400);
    return () => clearTimeout(t);
  }, [...commonArgs]);

  // Fetch only the current tab when its page changes
  useEffect(() => { fetchMain(mainPage); }, [mainPage]);
  useEffect(() => { fetchComp(compPage); }, [compPage]);

  const refreshAll = () => { fetchMain(mainPage); fetchComp(compPage); };

  const onCategoryChange = (val: string) => {
    setSelCategory(val);
    setSelGeneration(""); setSelCapacity(""); setSelAttrType(""); setSelInterface(""); setSelSeries("");
    if (COMP_CATEGORIES.includes(val)) setActiveTab("component");
    else if (MAIN_CATEGORIES.includes(val)) setActiveTab("main");
  };

  const totalDisplayed = activeTab === "main" ? mainTotal : compTotal;

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">

      {/* ================= HEADER & TOOLBAR ================= */}
      <div className="flex flex-col gap-6 mb-8">

        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900 tracking-tight">
            <div className="p-2 bg-blue-100/50 text-blue-600 rounded-xl border border-blue-200/50 shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            Quản lý Thiết bị
          </h1>
          <p className="text-slate-500 font-medium ml-1 mt-1">
            Đang hiển thị: <strong className="text-blue-600 text-base">{totalDisplayed}</strong> thiết bị.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* HÀNG 1: THANH TÌM KIẾM CHIẾM FULL WIDTH */}
          <div className="relative w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              placeholder="Tìm Serial Number, Tên thiết bị..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 w-full bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-1 focus-visible:ring-blue-500 transition-all hover:border-slate-300 text-base"
            />
          </div>

          {/* HÀNG 2: FILTER & HÀNH ĐỘNG IMPORT/EXPORT */}
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
                  <SelectItem value="IN_STOCK">Trong kho</SelectItem>
                  <SelectItem value="DEPLOYED">Đang sử dụng</SelectItem>
                  <SelectItem value="HANDED_OVER">Đã bàn giao</SelectItem>
                  <SelectItem value="MAINTENANCE">Bảo trì</SelectItem>
                  <SelectItem value="RENTED">Đang thuê</SelectItem>
                  <SelectItem value="FAULTY">Lỗi hỏng</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={refreshAll}
                disabled={mainLoading || compLoading}
                className="h-11 w-11 shrink-0 bg-white border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 text-slate-600 ${(mainLoading || compLoading) ? 'animate-spin' : ''}`} />
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

              <div className="w-[1px] h-6 bg-slate-200 mx-1 hidden sm:block"></div>

              <div className="shrink-0">
                <CreateAssetModal onRefresh={refreshAll} />
              </div>
            </div>
          </div>

          {/* HÀNG 3: DYNAMIC ATTR FILTERS (HORIZONTAL SCROLL) */}
          <div className="flex bg-white p-3 rounded-xl border border-slate-200 shadow-sm gap-3 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 shrink-0 border-r border-slate-200 pr-3">
              <Filter className="w-4 h-4 text-blue-600" />
              Lọc Nâng Cao
            </div>

            <div className="w-[160px] shrink-0">
              <Select value={selCategory} onValueChange={onCategoryChange}>
                <SelectTrigger className="bg-slate-50 h-9 font-medium border-slate-300"><SelectValue placeholder="Chọn Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                  <SelectItem value="SERVER">Server</SelectItem>
                  <SelectItem value="MEMORY">Bộ nhớ (RAM)</SelectItem>
                  <SelectItem value="STORAGE">Lưu trữ (Storage)</SelectItem>
                  <SelectItem value="CPU">Vi xử lý (CPU)</SelectItem>
                  <SelectItem value="GPU">Card đồ họa (GPU)</SelectItem>
                  <SelectItem value="NETWORK">Mạng (Network)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* DYNAMIC CATEGORY FILTERS */}
            {selCategory === "MEMORY" && (
              <>
                <Select value={selGeneration} onValueChange={setSelGeneration}>
                  <SelectTrigger className="w-[130px] h-9 bg-blue-50/50 border-blue-200 shrink-0"><SelectValue placeholder="Thế hệ RAM" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tất cả --</SelectItem>
                    {getGenerations().map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Dung lượng..."
                  value={selCapacity}
                  onChange={e => setSelCapacity(e.target.value)}
                  className="w-[120px] h-9 bg-blue-50/50 border-blue-200 shrink-0 text-sm"
                />
              </>
            )}

            {selCategory === "STORAGE" && (
              <>
                <Select value={selAttrType} onValueChange={setSelAttrType}>
                  <SelectTrigger className="w-[130px] h-9 bg-emerald-50/50 border-emerald-200 shrink-0"><SelectValue placeholder="Loại ổ cứng" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tất cả --</SelectItem>
                    {getStorageTypes().map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Dung lượng..."
                  value={selCapacity}
                  onChange={e => setSelCapacity(e.target.value)}
                  className="w-[120px] h-9 bg-emerald-50/50 border-emerald-200 shrink-0 text-sm"
                />
                <Select value={selInterface} onValueChange={setSelInterface}>
                  <SelectTrigger className="w-[120px] h-9 bg-emerald-50/50 border-emerald-200 shrink-0"><SelectValue placeholder="Giao tiếp" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tất cả --</SelectItem>
                    {getStorageInterfaces().map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}

            {selCategory === "CPU" && (
              <Select value={selSeries} onValueChange={setSelSeries}>
                <SelectTrigger className="w-[140px] h-9 bg-purple-50/50 border-purple-200 shrink-0"><SelectValue placeholder="Dòng (Series)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Tất cả --</SelectItem>
                  {getCpuSeries().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <div className="w-[1px] h-6 bg-slate-200 shrink-0"></div>

            <div className="relative w-[180px] shrink-0">
              <Input
                placeholder="Lọc theo chủ sở hữu..."
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="h-9 bg-yellow-50/50 border-yellow-200 text-sm placeholder:text-yellow-600/60"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= TABS CONTAINER ================= */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex h-auto p-1 bg-slate-100/80 rounded-lg mb-6 border border-slate-200/60">
          <TabsTrigger
            value="main"
            className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all font-medium"
          >
            <Server className="w-4 h-4 text-blue-600 hidden sm:block" />
            <span>Thiết bị</span>
            <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {mainTotal}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="component"
            className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all font-medium"
          >
            <Cpu className="w-4 h-4 text-purple-600 hidden sm:block" />
            <span>Linh kiện</span>
            <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {compTotal}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="focus-visible:outline-none focus-visible:ring-0 mt-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <AssetTable data={mainAssets} loading={mainLoading} onRefresh={refreshAll} />
          </div>
          {mainTotalPages > 1 && (
            <div className="flex items-center justify-between bg-white border rounded-xl px-4 py-3 shadow-sm mt-3">
              <p className="text-sm text-slate-500">Trang <strong>{mainPage}</strong> / {mainTotalPages} · Tổng <strong>{mainTotal}</strong></p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setMainPage(1)} disabled={mainPage === 1}>«</Button>
                <Button variant="outline" size="sm" onClick={() => setMainPage(p => Math.max(1, p - 1))} disabled={mainPage === 1}>‹</Button>
                <span className="text-sm font-medium px-2">{mainPage}</span>
                <Button variant="outline" size="sm" onClick={() => setMainPage(p => Math.min(mainTotalPages, p + 1))} disabled={mainPage === mainTotalPages}>›</Button>
                <Button variant="outline" size="sm" onClick={() => setMainPage(mainTotalPages)} disabled={mainPage === mainTotalPages}>»</Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="component" className="focus-visible:outline-none focus-visible:ring-0 mt-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <AssetTable data={compAssets} loading={compLoading} onRefresh={refreshAll} />
          </div>
          {compTotalPages > 1 && (
            <div className="flex items-center justify-between bg-white border rounded-xl px-4 py-3 shadow-sm mt-3">
              <p className="text-sm text-slate-500">Trang <strong>{compPage}</strong> / {compTotalPages} · Tổng <strong>{compTotal}</strong></p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCompPage(1)} disabled={compPage === 1}>«</Button>
                <Button variant="outline" size="sm" onClick={() => setCompPage(p => Math.max(1, p - 1))} disabled={compPage === 1}>‹</Button>
                <span className="text-sm font-medium px-2">{compPage}</span>
                <Button variant="outline" size="sm" onClick={() => setCompPage(p => Math.min(compTotalPages, p + 1))} disabled={compPage === compTotalPages}>›</Button>
                <Button variant="outline" size="sm" onClick={() => setCompPage(compTotalPages)} disabled={compPage === compTotalPages}>»</Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}