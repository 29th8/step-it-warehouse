"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RackTable } from "@/components/racks/rack-table";
import { AssetTable, type AssetTableRow } from "@/components/inventory/asset-table";
import { WarehouseActionMenu } from "@/components/warehouse/warehouse-action-menu";

type WarehouseDetail = {
  id: string;
  name: string;
  location: string | null;
  racks: { id: string; name: string; type: string; totalUnits: number | null; _count: { assets: number } }[];
  counts: { main: number; loose: number; installed: number; total: number };
  outside: { data: AssetTableRow[]; total: number; page: number; totalPages: number };
};

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [warehouse, setWarehouse] = useState<WarehouseDetail | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/warehouses/${encodeURIComponent(id)}?page=${page}`, { signal });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Không thể tải kho");
      if (signal?.aborted) return;
      setWarehouse(json.data);
      setError("");
      if (page > json.data.outside.totalPages) setPage(json.data.outside.totalPages);
    } catch (cause) {
      if (signal?.aborted) return;
      setError(cause instanceof Error ? cause.message : "Không thể tải kho");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = () => { void load(); };

  if (!warehouse) return <div className="p-6 text-sm text-slate-600">{loading ? "Đang tải kho..." : <><p>{error || "Không tìm thấy kho."}</p><Link href="/warehouses" className="mt-3 inline-block text-blue-700 underline">Quay lại vị trí</Link></>}</div>;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-3 sm:p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon" title="Quay lại vị trí"><Link href="/warehouses" aria-label="Quay lại vị trí"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div className="min-w-0"><h1 className="break-words text-2xl font-bold text-slate-900">{warehouse.name}</h1><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4 shrink-0" />{warehouse.location || "Chưa cập nhật vị trí"}</p></div>
        </div>
        <div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={refresh} disabled={loading} title="Làm mới" aria-label="Làm mới"><RefreshCw className="h-4 w-4" /></Button><WarehouseActionMenu warehouse={warehouse} onRefresh={refresh} onDeleted={() => router.push("/warehouses")} /></div>
      </header>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-3 border-b border-slate-200 pb-5 md:grid-cols-4">
        {[{ label: "Tổng tài sản", count: warehouse.counts.total }, { label: "Thiết bị chính", count: warehouse.counts.main }, { label: "Linh kiện rời", count: warehouse.counts.loose }, { label: "Linh kiện đã lắp", count: warehouse.counts.installed }].map((item) => <div key={item.label}><p className="text-sm text-slate-500">{item.label}</p><p className="mt-1 text-xl font-bold text-slate-900">{item.count}</p></div>)}
      </div>

      <section className="space-y-3"><div><h2 className="text-lg font-bold text-slate-900">Tủ trong kho</h2><p className="text-sm text-slate-500">{warehouse.racks.length} tủ</p></div><RackTable racks={warehouse.racks} warehouseId={warehouse.id} onRefresh={refresh} /></section>
      <section className="space-y-3"><div><h2 className="text-lg font-bold text-slate-900">Thiết bị ngoài tủ</h2><p className="text-sm text-slate-500">{warehouse.outside.total} thiết bị và linh kiện rời</p></div><div className="overflow-hidden rounded-md border border-slate-200"><AssetTable data={warehouse.outside.data} loading={loading} onRefresh={refresh} /></div>
        {warehouse.outside.totalPages > 1 && <div className="flex items-center justify-end gap-3"><Button variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>Trước</Button><span className="text-sm text-slate-600">Trang {page} / {warehouse.outside.totalPages}</span><Button variant="outline" size="sm" disabled={loading || page >= warehouse.outside.totalPages} onClick={() => setPage((value) => value + 1)}>Sau</Button></div>}
      </section>
    </div>
  );
}
