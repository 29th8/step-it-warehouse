"use client";

import React, { useEffect, useState } from "react";
import { Warehouse, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { WarehouseTable } from "@/components/warehouse/warehouse-table";
import { CreateWarehouseModal } from "@/components/warehouse/create-warehouse-modal";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // const fetchWarehouses = async () => {
  //   setLoading(true);
  //   try {
  //     const res = await fetch("/api/warehouses");
  //     const data = await res.json();
  //     setWarehouses(data);
  //   } finally { setLoading(false); }
  // };

  // useEffect(() => { fetchWarehouses(); }, []);

  // const filteredWarehouses = warehouses.filter(w =>
  //   w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //   w.location.toLowerCase().includes(searchQuery.toLowerCase())
  // );

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/warehouses");
      const json = await res.json();

      // ==========================================
      // FIX LỖI Ở ĐÂY: Kiểm tra format JSON
      // ==========================================
      if (Array.isArray(json)) {
        setWarehouses(json);
      } else if (json.data && Array.isArray(json.data)) {
        setWarehouses(json.data); // Bóc lớp "data" ra
      } else {
        setWarehouses([]);
      }
    } catch (err) {
      console.error(err);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWarehouses(); }, []);

  // Đảm bảo warehouses luôn là mảng trước khi filter
  const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];

  const filteredWarehouses = safeWarehouses.filter(w =>
    (w.name && w.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (w.location && w.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Warehouse className="w-6 h-6 text-blue-600" /> Quản lý Kho</h1>
          <p className="text-sm text-slate-500 mt-1">Danh sách các kho chứa và trung tâm dữ liệu.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Tìm tên kho, vị trí..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-white" />
          </div>
          <CreateWarehouseModal onRefresh={fetchWarehouses} />
        </div>
      </div>

      {loading ? (
        <p className="text-center py-10">Đang tải danh sách kho...</p>
      ) : (
        <WarehouseTable data={filteredWarehouses} onRefresh={fetchWarehouses} />
      )}
    </div>
  );
}