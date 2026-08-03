"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Grid3x3, Server, Loader2, AlertTriangle, Package, Box, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RackVisualizer } from "@/components/racks/RackVisualizer";
import { AssetActionMenu } from "@/components/inventory/asset-action-menu";

type RackAsset = {
  id: string;
  serialNumber: string;
  status: string;
  owner?: string | null;
  rackUnit: number | null;
  uHeight: number;
  product?: {
    name?: string | null;
    category?: string | null;
  } | null;
  components?: RackAsset[];
};

interface RackDetail {
  id: string;
  name: string;
  type: string;
  totalUnits: number | null;
  warehouse: { name: string; location: string };
  assets: RackAsset[];
}

export default function RackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rackId = params.id as string;

  const [rack, setRack] = useState<RackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailAsset, setDetailAsset] = useState<{ id: string; serialNumber: string } | null>(null);
  const [detailOpenToken, setDetailOpenToken] = useState(0);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openAssetDetail = (asset: RackAsset) => {
    setDetailAsset({ id: asset.id, serialNumber: asset.serialNumber });
    setDetailOpenToken((token) => token + 1);
  };

  const fetchRack = async () => {
    if (!rackId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/racks/${rackId}`);
      if (!res.ok) throw new Error("Không tìm thấy tủ rack");

      const json = await res.json();
      setRack(json.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không tìm thấy tủ rack";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRack();
  }, [rackId]);

  if (loading) {
    return <div className="h-[80vh] flex flex-col items-center justify-center space-y-4 px-4"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /><p className="text-slate-500">Đang tải mô hình tủ rack...</p></div>;
  }

  if (error || !rack) {
    return (
      <div className="p-4 md:p-8 text-center space-y-4">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold text-slate-800">Lỗi tải dữ liệu</h2>
        <p className="text-slate-500">{error}</p>
        <Button onClick={() => router.push("/racks")} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách</Button>
      </div>
    );
  }

  const isDatacenter = rack.type === "DATACENTER";
  const fillPercentage = isDatacenter && rack.totalUnits
    ? Math.round((rack.assets.length / rack.totalUnits) * 100)
    : 0;

  const statusColors: Record<string, string> = {
    IN_STOCK: "bg-green-100 text-green-700 border-green-200",
    INSTALLED: "bg-indigo-100 text-indigo-700 border-indigo-200",
    DEPLOYED: "bg-blue-100 text-blue-700 border-blue-200",
    RENTED: "bg-purple-100 text-purple-700 border-purple-200",
    MAINTENANCE: "bg-yellow-100 text-yellow-700 border-yellow-200",
    FAULTY: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-start gap-3 md:gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full shadow-sm"><ArrowLeft className="w-4 h-4" /></Button>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            {isDatacenter ? <Grid3x3 className="w-8 h-8 text-blue-600" /> : <Box className="w-8 h-8 text-amber-600" />}
            <span className="truncate">{rack.name}</span>
          </h1>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <p className="text-slate-500 flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" /> {rack.warehouse.name} ({rack.warehouse.location || "Chưa cập nhật vị trí"})
            </p>
            <Badge variant="outline" className={isDatacenter ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
              {isDatacenter ? "🏢 Rack Datacenter" : "📦 Tủ lưu trữ"}
            </Badge>
          </div>
        </div>
      </div>

      {isDatacenter ? (
        /* ========== DATACENTER VIEW ========== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CỘT TRÁI: THÔNG TIN CHUNG */}
          <div className="space-y-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50/50 pb-4 border-b">
                <CardTitle className="text-lg font-bold text-slate-700">Thông số kỹ thuật</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border">
                  <span className="text-sm text-slate-500">Tổng số U</span>
                  <span className="font-mono font-bold text-lg text-slate-800">{rack.totalUnits}U</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-sm text-blue-600 font-medium">Thiết bị đang gắn</span>
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-lg px-3">{rack.assets.length}</Badge>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-medium text-slate-500">
                    <span>Mức độ lấp đầy</span>
                    <span>{fillPercentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${fillPercentage > 80 ? 'bg-red-500' : fillPercentage > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${fillPercentage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danh sách thiết bị nguyên chiếc — expandable components */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50/50 pb-4 border-b">
                <CardTitle className="text-lg font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-slate-500" /> Danh sách thiết bị
                  </span>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{rack.assets.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                {rack.assets.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 italic">Tủ Rack đang trống.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {rack.assets
                      .sort((a, b) => (b.rackUnit || 0) - (a.rackUnit || 0))
                      .map((asset) => {
                        const isOpen = expandedIds.has(asset.id);
                        const compCount = asset.components?.length || 0;
                        return (
                          <div key={asset.id}>
                            {/* ROW THIẾT BỊ NGUYÊN CHIẾC */}
                            <div
                              className={`p-3 flex justify-between items-center transition-colors ${isOpen ? "bg-blue-50/60" : "hover:bg-slate-50"}`}
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="min-w-10 h-6 flex items-center justify-center bg-slate-100 font-mono text-xs border-slate-200 shrink-0">
                                  {asset.rackUnit ? `U${asset.rackUnit}` : "Không U"}
                                </Badge>
                                <button
                                  type="button"
                                  onClick={() => openAssetDetail(asset)}
                                  className="text-left min-w-0 rounded px-1 py-0.5 hover:bg-white"
                                >
                                  <p className="font-semibold text-sm text-slate-800">{asset.product?.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{asset.serialNumber}</p>
                                </button>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {compCount > 0 && (
                                  <span className="text-[10px] text-slate-400">{compCount} linh kiện</span>
                                )}
                                {compCount > 0
                                  ? (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        toggleExpand(asset.id);
                                      }}
                                      className="p-1 rounded hover:bg-white"
                                      aria-label={isOpen ? "Thu gọn linh kiện" : "Mở danh sách linh kiện"}
                                    >
                                      {isOpen
                                        ? <ChevronDown className="w-4 h-4 text-blue-400" />
                                        : <ChevronRight className="w-4 h-4 text-slate-300" />}
                                    </button>
                                  )
                                  : <Server className="w-4 h-4 text-slate-200" />
                                }
                              </div>
                            </div>

                            {/* LINH KIỆN BÊN TRONG */}
                            {isOpen && compCount > 0 && (
                              <div className="bg-slate-50 border-t border-slate-100 divide-y divide-slate-100">
                                {(asset.components || []).map((comp) => (
                                  <div
                                    key={comp.id}
                                    onClick={() => openAssetDetail(comp)}
                                    className="pl-10 pr-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-white"
                                  >
                                    <div className="w-1 h-4 bg-blue-200 rounded-full shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-slate-700 truncate">{comp.product?.name}</p>
                                      <p className="text-[10px] text-slate-400 font-mono">{comp.serialNumber}</p>
                                    </div>
                                    <span className="ml-auto text-[10px] text-slate-400 shrink-0">{comp.product?.category}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CỘT PHẢI: MÔ HÌNH TRỰC QUAN */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-slate-200 bg-slate-950 text-white overflow-hidden">
              <CardHeader className="bg-slate-900 border-b border-slate-800 pb-4">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Server className="w-5 h-5 text-blue-500" /> Sơ đồ lắp đặt vật lý
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-8 bg-slate-950 flex justify-center overflow-x-auto">
                <RackVisualizer totalUnits={rack.totalUnits!} assets={rack.assets} />
              </CardContent>
            </Card>
          </div>
        </div>

      ) : (
        /* ========== STORAGE VIEW ========== */
        <div className="space-y-6">
          <Card className="shadow-sm border-amber-200 bg-amber-50/30">
            <CardHeader className="bg-amber-50/50 pb-4 border-b border-amber-100">
              <CardTitle className="text-lg font-bold text-amber-800 flex items-center gap-2">
                <Package className="w-5 h-5" /> Thông tin tủ lưu trữ
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-amber-100">
                <span className="text-sm text-amber-700 font-medium">Tổng thiết bị / linh kiện</span>
                <Badge className="bg-amber-600 hover:bg-amber-700 text-lg px-3">{rack.assets.length}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 pb-4 border-b">
              <CardTitle className="text-lg font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-slate-500" /> Danh sách thiết bị trong tủ
                </span>
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{rack.assets.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {rack.assets.length === 0 ? (
                <p className="text-center py-12 text-slate-400 italic">Tủ lưu trữ đang trống.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {rack.assets.map((asset) => {
                    const isOpen = expandedIds.has(asset.id);
                    const compCount = asset.components?.length || 0;
                    return (
                      <div key={asset.id}>
                        {/* ROW THIẾT BỊ NGUYÊN CHIẾC */}
                        <div
                          className={`px-4 py-3 flex items-center gap-3 transition-colors ${isOpen ? "bg-blue-50/60" : "hover:bg-slate-50"}`}
                        >
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => openAssetDetail(asset)}
                              className="text-left max-w-full rounded px-1 py-0.5 hover:bg-white"
                            >
                              <p className="font-semibold text-sm text-slate-800 truncate">{asset.product?.name}</p>
                            </button>
                            <div className="flex items-center gap-3 mt-0.5 px-1">
                              <span className="font-mono text-[10px] text-slate-400">{asset.serialNumber}</span>
                              {asset.owner && <span className="text-[10px] text-slate-500">{asset.owner}</span>}
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-xs shrink-0 ${statusColors[asset.status] || "bg-slate-100 text-slate-700"}`}>
                            {asset.status}
                          </Badge>
                          <div className="flex items-center gap-1 shrink-0">
                            {compCount > 0 && <span className="text-[10px] text-slate-400">{compCount}</span>}
                            {compCount > 0
                              ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleExpand(asset.id);
                                  }}
                                  className="p-1 rounded hover:bg-white"
                                  aria-label={isOpen ? "Thu gọn linh kiện" : "Mở danh sách linh kiện"}
                                >
                                  {isOpen ? <ChevronDown className="w-4 h-4 text-blue-400" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                                </button>
                              )
                              : <div className="w-4" />
                            }
                          </div>
                        </div>

                        {/* LINH KIỆN BÊN TRONG */}
                        {isOpen && compCount > 0 && (
                          <div className="bg-slate-50 border-t border-slate-100 divide-y divide-slate-100">
                            {(asset.components || []).map((comp) => (
                              <div
                                key={comp.id}
                                onClick={() => openAssetDetail(comp)}
                                className="pl-10 pr-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-white"
                              >
                                <div className="w-1 h-4 bg-blue-200 rounded-full shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-700 truncate">{comp.product?.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{comp.serialNumber}</p>
                                </div>
                                <span className="text-[10px] text-slate-400 shrink-0">{comp.product?.category}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {detailAsset && (
        <AssetActionMenu
          asset={detailAsset}
          hideTrigger
          openToken={detailOpenToken}
          onRefresh={fetchRack}
          onDetailClose={() => setDetailAsset(null)}
        />
      )}
    </div>
  );
}
