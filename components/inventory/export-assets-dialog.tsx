"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, LoaderCircle, Settings2, Tags } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const COLUMN_OPTIONS = [
  { key: "serialNumber", label: "Số serial" },
  { key: "productModel", label: "Mã sản phẩm" },
  { key: "productName", label: "Tên sản phẩm" },
  { key: "productCategory", label: "Danh mục" },
  { key: "status", label: "Trạng thái" },
  { key: "warehouse", label: "Tên kho" },
  { key: "rack", label: "Tên rack" },
  { key: "rackUnit", label: "Vị trí U" },
  { key: "uHeight", label: "Chiều cao U" },
  { key: "parentSerial", label: "Serial thiết bị cha" },
  { key: "installSlotType", label: "Loại slot" },
  { key: "installSlotName", label: "Tên slot DIMM/BAY" },
  { key: "owner", label: "Chủ sở hữu" },
  { key: "notes", label: "Ghi chú" },
  { key: "createdAt", label: "Ngày nhập" },
] as const;

type ColumnKey = (typeof COLUMN_OPTIONS)[number]["key"];
type ExportScope = "filtered" | "selected" | "custom";

const STORAGE_KEY = "warehouse-export-columns";
const defaultColumns = COLUMN_OPTIONS.map((column) => column.key);

type ExportAssetsDialogProps = {
  filterParams: URLSearchParams;
  filteredCount: number;
  selectedIds: string[];
  categories: Array<{ id: string; name: string }>;
};

const STATUS_OPTIONS = [
  { value: "IN_STOCK", label: "Trong kho" },
  { value: "INSTALLED", label: "Đã lắp trong server" },
  { value: "DEPLOYED", label: "Đang sử dụng" },
  { value: "HANDED_OVER", label: "Đã bàn giao" },
  { value: "MAINTENANCE", label: "Bảo trì" },
  { value: "RENTED", label: "Đang thuê" },
  { value: "FAULTY", label: "Lỗi hỏng" },
  { value: "DISPOSED", label: "Thanh lý" },
  { value: "RESERVED", label: "Đã giữ" },
] as const;

export function ExportAssetsDialog({ filterParams, filteredCount, selectedIds, categories }: ExportAssetsDialogProps) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<ExportScope>("filtered");
  const [columns, setColumns] = useState<ColumnKey[]>(defaultColumns);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [customCount, setCustomCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as unknown;
      if (Array.isArray(saved)) {
        const validColumns = saved.filter((key): key is ColumnKey => typeof key === "string" && defaultColumns.includes(key as ColumnKey));
        if (validColumns.length > 0) setColumns(validColumns);
      }
    } catch {
      // Keep the standard columns when browser storage is unavailable or malformed.
    }
  }, []);

  useEffect(() => {
    if (!open || scope !== "custom") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCountLoading(true);
      try {
        const params = new URLSearchParams({ scope: "custom", countOnly: "true" });
        if (categoryIds.length > 0) params.set("categories", categoryIds.join(","));
        if (statuses.length > 0) params.set("statuses", statuses.join(","));
        const response = await fetch(`/api/assets/export/report?${params.toString()}`, { signal: controller.signal });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Không thể đếm dữ liệu export.");
        setCustomCount(typeof json.total === "number" ? json.total : null);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setCustomCount(null);
      } finally {
        setCountLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [categoryIds, open, scope, statuses]);

  const scopeDescription = useMemo(() => {
    if (scope === "selected") return `${selectedIds.length} thiết bị đã chọn`;
    if (scope === "filtered") return `${filteredCount} thiết bị theo bộ lọc hiện tại`;
    const categoryLabel = categoryIds.length ? `${categoryIds.length} danh mục` : "tất cả danh mục";
    const statusLabel = statuses.length ? `${statuses.length} trạng thái` : "tất cả trạng thái";
    return `Điều kiện: ${categoryLabel}, ${statusLabel}`;
  }, [categoryIds.length, filteredCount, scope, selectedIds.length, statuses.length]);

  const toggleColumn = (key: ColumnKey, checked: boolean) => {
    setColumns((current) => {
      const next = checked ? [...current, key] : current.filter((column) => column !== key);
      if (next.length === 0) return current;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleValue = (values: string[], value: string, checked: boolean, setValues: (next: string[]) => void) => {
    setValues(checked ? [...values, value] : values.filter((current) => current !== value));
  };

  const allCategoriesSelected = categories.length > 0 && categoryIds.length === categories.length;
  const allStatusesSelected = statuses.length === STATUS_OPTIONS.length;

  const handleExport = async () => {
    if (scope === "selected" && selectedIds.length === 0) {
      toast.error("Hãy chọn ít nhất một thiết bị để xuất.");
      return;
    }
    if (columns.length === 0) {
      toast.error("Hãy chọn ít nhất một cột để xuất.");
      return;
    }

    setExporting(true);
    try {
      let response: Response;
      if (scope === "selected") {
        response = await fetch("/api/assets/export/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetIds: selectedIds, columns }),
        });
      } else {
        const params = new URLSearchParams(scope === "filtered" ? filterParams : undefined);
        params.set("scope", scope);
        params.set("columns", columns.join(","));
        if (scope === "custom") {
          if (categoryIds.length > 0) params.set("categories", categoryIds.join(","));
          if (statuses.length > 0) params.set("statuses", statuses.join(","));
        }
        response = await fetch(`/api/assets/export/report?${params.toString()}`);
      }

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error || "Không thể xuất file Excel.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bao-cao-kho-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
      toast.success("Đã xuất file Excel.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xuất file Excel.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 shrink-0 bg-white text-slate-700 shadow-sm hover:bg-slate-50">
          <Download className="h-4 w-4 text-green-600" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto bg-white p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-slate-100 px-6 py-5 pr-12">
          <DialogTitle className="flex items-center gap-2 text-slate-900"><FileSpreadsheet className="h-5 w-5 text-green-600" />Xuất Excel</DialogTitle>
          <DialogDescription>Chọn phạm vi và các cột cần có trong file.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 px-6 py-5">
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Phạm vi xuất</h3>
            <div className="grid gap-2">
              {[
                { value: "filtered" as const, title: "Theo bộ lọc hiện tại", description: `${filteredCount} thiết bị phù hợp` },
                { value: "selected" as const, title: "Thiết bị đã chọn", description: `${selectedIds.length} thiết bị được chọn` },
                { value: "custom" as const, title: "Tùy chọn điều kiện xuất", description: "Chọn danh mục và trạng thái cần xuất" },
              ].map((option) => (
                <button key={option.value} type="button" onClick={() => setScope(option.value)} className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${scope === option.value ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${scope === option.value ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"}`}><span className={scope === option.value ? "h-1.5 w-1.5 rounded-full bg-white" : ""} /></span>
                  <span><span className="block text-sm font-semibold text-slate-800">{option.title}</span><span className="block text-xs text-slate-500">{option.description}</span></span>
                </button>
              ))}
            </div>
          </section>

          {scope === "custom" && (
            <section className="space-y-5 border-t border-slate-100 pt-5">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Tags className="h-4 w-4 text-blue-600" />Điều kiện xuất</h3>
                <p className="mt-1 text-xs text-slate-500">Trong mỗi nhóm, chọn nhiều giá trị để lấy một trong các giá trị đó. Hai nhóm được kết hợp đồng thời; mỗi danh mục đã chọn sẽ là một sheet riêng.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-700">Danh mục</p><button type="button" onClick={() => setCategoryIds(allCategoriesSelected ? [] : categories.map((category) => category.id))} disabled={categories.length === 0} className="text-xs font-medium text-blue-600 disabled:text-slate-300">{allCategoriesSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}</button></div>
                <div className="grid gap-1 sm:grid-cols-2">
                  {categories.map((category) => (
                    <label key={category.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"><Checkbox checked={categoryIds.includes(category.id)} onCheckedChange={(checked) => toggleValue(categoryIds, category.id, checked === true, setCategoryIds)} />{category.name}</label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-700">Trạng thái</p><button type="button" onClick={() => setStatuses(allStatusesSelected ? [] : STATUS_OPTIONS.map((status) => status.value))} className="text-xs font-medium text-blue-600">{allStatusesSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}</button></div>
                <div className="grid gap-1 sm:grid-cols-2">
                  {STATUS_OPTIONS.map((status) => (
                    <label key={status.value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"><Checkbox checked={statuses.includes(status.value)} onCheckedChange={(checked) => toggleValue(statuses, status.value, checked === true, setStatuses)} />{status.label}</label>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                {countLoading ? "Đang tính số lượng thiết bị..." : <>Kết quả dự kiến: <strong>{customCount ?? 0}</strong> thiết bị</>}
              </div>
            </section>
          )}

          <section className="space-y-3 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Settings2 className="h-4 w-4 text-slate-500" />Cột xuất</h3><span className="text-xs text-slate-500">{columns.length}/{COLUMN_OPTIONS.length} cột</span></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {COLUMN_OPTIONS.map((column) => (
                <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                  <Checkbox checked={columns.includes(column.key)} onCheckedChange={(checked) => toggleColumn(column.key, checked === true)} />
                  {column.label}
                </label>
              ))}
            </div>
          </section>
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          <p className="mr-auto hidden text-sm text-slate-500 sm:block">{scopeDescription}</p>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={exporting}>Hủy</Button>
          <Button type="button" onClick={handleExport} disabled={exporting || (scope === "selected" && selectedIds.length === 0)} className="bg-green-600 text-white hover:bg-green-700">{exporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{exporting ? "Đang xuất" : "Xuất Excel"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
