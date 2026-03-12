"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Warehouse, Grid3x3, Server, Loader2, RefreshCw, Search, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import Input
import { RackTable } from "@/components/racks/rack-table";

// Định nghĩa Type
interface Rack { id: string; name: string; totalUnits: number; _count: { assets: number }; }
interface WarehouseWithRacks {
    id: string;
    name: string;
    location: string;
    racks: Rack[];
    _count: { assets: number; racks: number; };
}

export default function RacksPage() {
    const [data, setData] = useState<WarehouseWithRacks[]>([]);
    const [loading, setLoading] = useState(true);

    // State tìm kiếm
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/warehouses");
            if (!res.ok) throw new Error("Failed to fetch data");
            const result = await res.json();

            // Xử lý linh hoạt format trả về { data: [] } hoặc []
            const list = Array.isArray(result)
                ? result
                : (result && Array.isArray(result.data))
                    ? result.data
                    : [];

            setData(list);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // LOGIC LỌC DỮ LIỆU THÔNG MINH
    const filteredData = data.map(warehouse => {
        const query = searchQuery.toLowerCase();

        // Kiểm tra xem tên Kho hoặc vị trí có khớp không
        const isWarehouseMatch =
            warehouse.name.toLowerCase().includes(query) ||
            (warehouse.location && warehouse.location.toLowerCase().includes(query));

        // Lọc danh sách Rack bên trong kho
        const matchingRacks = warehouse.racks.filter(r =>
            r.name.toLowerCase().includes(query)
        );

        // Nếu Kho khớp -> Hiển thị kho và toàn bộ rack
        if (isWarehouseMatch) {
            return warehouse;
        }

        // Nếu Kho không khớp, nhưng có Rack bên trong khớp -> Hiển thị kho và các rack khớp
        if (matchingRacks.length > 0) {
            return { ...warehouse, racks: matchingRacks };
        }

        // Không khớp gì cả -> Ẩn
        return null;
    }).filter((item): item is WarehouseWithRacks => item !== null); // Loại bỏ null

    if (loading) {
        return <div className="flex justify-center items-center h-[80vh]"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>
    }

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">

            {/* HEADER & TOOLBAR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900 tracking-tight">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-sm">
                            <Grid3x3 className="w-6 h-6" />
                        </div>
                        Quản lý Tủ Rack
                    </h1>
                    <p className="text-sm text-slate-500 font-medium ml-1">
                        Tổ chức và quản lý sơ đồ vị trí các tủ rack trong kho.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* THANH TÌM KIẾM */}
                    <div className="relative w-full md:w-[320px] group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <Input
                            placeholder="Tìm tên kho, vị trí hoặc tên rack..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 w-full bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-1 focus-visible:ring-blue-500 transition-all hover:border-slate-300 text-base sm:text-sm"
                        />
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchData}
                        className="h-11 w-11 shrink-0 bg-white border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
                        title="Làm mới dữ liệu"
                    >
                        <RefreshCw className="w-4 h-4 text-slate-600" />
                    </Button>
                </div>
            </div>

            {/* DANH SÁCH KHO VÀ RACK */}
            <div className="space-y-8">
                {filteredData.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <Grid3x3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Không tìm thấy kho hoặc tủ rack nào phù hợp.</p>
                    </div>
                ) : (
                    filteredData.map(warehouse => (
                        <Card key={warehouse.id} className="shadow-sm border-slate-200 overflow-hidden">
                            <CardHeader className="bg-slate-50/80 border-b py-4">
                                <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <Warehouse className="w-5 h-5 text-slate-500" />
                                            <span className="text-lg font-bold text-slate-800">{warehouse.name}</span>
                                        </div>
                                        {warehouse.location && (
                                            <p className="text-xs text-slate-500 flex items-center gap-1 ml-7">
                                                <MapPin className="w-3 h-3" /> {warehouse.location}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs font-medium bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                                        <span className="flex items-center gap-1.5 text-blue-700">
                                            <Grid3x3 className="w-3.5 h-3.5" />
                                            {warehouse._count?.racks || warehouse.racks.length} Tủ
                                        </span>
                                        <div className="h-4 w-px bg-slate-200"></div>
                                        <span className="flex items-center gap-1.5 text-purple-700">
                                            <Server className="w-3.5 h-3.5" />
                                            {warehouse._count?.assets || 0} Thiết bị
                                        </span>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 sm:p-6">
                                {/* BẢNG RACK */}
                                <RackTable
                                    racks={warehouse.racks}
                                    warehouseId={warehouse.id}
                                    onRefresh={fetchData}
                                />
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}