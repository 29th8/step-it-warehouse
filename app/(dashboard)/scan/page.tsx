"use client";

import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Server, MapPin, RefreshCw, AlertCircle, CheckCircle2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "Trong kho", DEPLOYED: "Đang dùng", RENTED: "Đang thuê",
  MAINTENANCE: "Bảo trì", FAULTY: "Hỏng", DISPOSED: "Thanh lý",
};

export default function MobileScannerPage() {
  const [scannedAsset, setScannedAsset] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [manualSN, setManualSN] = useState("");

  useEffect(() => {
    let scanner: Html5QrcodeScanner;
    if (isScanning) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(async (decodedText: string) => {
        setIsScanning(false);
        scanner.clear();
        await fetchAssetBySN(decodedText.trim().toUpperCase());
      }, () => {});
    }
    return () => { if (scanner) scanner.clear(); };
  }, [isScanning]);

  const fetchAssetBySN = async (sn: string) => {
    if (!sn) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/assets?search=${encodeURIComponent(sn)}`);
      const assets = await res.json();
      const list = Array.isArray(assets) ? assets : assets.data || [];
      const asset = list.find((a: any) => a.serialNumber === sn);
      if (asset) {
        setScannedAsset(asset);
        setIsScanning(false);
      } else {
        toast.error(`Không tìm thấy thiết bị: ${sn}`);
        setIsScanning(true);
      }
    } catch {
      toast.error("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!scannedAsset) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/assets/${scannedAsset.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Đã cập nhật trạng thái: ${STATUS_LABELS[newStatus] || newStatus}`);
        setScannedAsset({ ...scannedAsset, status: newStatus });
      } else {
        const err = await res.json();
        toast.error(err.error || "Cập nhật thất bại");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setScannedAsset(null); setManualSN(""); setIsScanning(true); };

  return (
    <div className="max-w-md mx-auto p-4 space-y-5">
      <div className="text-center">
        <h1 className="text-xl font-bold">Kiểm kê nhanh QR</h1>
        <p className="text-xs text-slate-500 mt-1">Quét mã QR hoặc nhập Serial Number thủ công</p>
      </div>

      {/* Camera */}
      {isScanning && (
        <div className="overflow-hidden rounded-xl border-2 border-blue-500 shadow-lg bg-black">
          <div id="reader" className="w-full" />
        </div>
      )}

      {/* Manual input */}
      {isScanning && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Nhập Serial Number..."
              value={manualSN}
              onChange={e => setManualSN(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && fetchAssetBySN(manualSN)}
              className="pl-9 font-mono uppercase"
            />
          </div>
          <Button onClick={() => fetchAssetBySN(manualSN)} disabled={!manualSN || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tìm"}
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && !scannedAsset && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Kết quả */}
      {scannedAsset && (
        <Card className="animate-in slide-in-from-bottom-4 duration-300 shadow-md">
          <CardHeader className="bg-slate-50 border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base">{scannedAsset.product?.name}</CardTitle>
                <p className="text-sm font-mono text-blue-600 font-bold mt-0.5">{scannedAsset.serialNumber}</p>
                {scannedAsset.owner && <p className="text-xs text-slate-500 mt-0.5">Chủ: {scannedAsset.owner}</p>}
              </div>
              <Badge className={
                scannedAsset.status === "IN_STOCK" ? "bg-green-600" :
                scannedAsset.status === "FAULTY" ? "bg-red-600" :
                scannedAsset.status === "DEPLOYED" ? "bg-blue-600" : "bg-slate-500"
              }>
                {STATUS_LABELS[scannedAsset.status] || scannedAsset.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{scannedAsset.warehouse?.name || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                <Server className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{scannedAsset.rack?.name ? `${scannedAsset.rack.name} U${scannedAsset.rackUnit}` : "Không có rack"}</span>
              </div>
            </div>

            {scannedAsset.parent && (
              <div className="bg-indigo-50 border border-indigo-100 p-2 rounded-lg text-xs text-indigo-700">
                Gắn vào: <strong>{scannedAsset.parent.serialNumber}</strong> ({scannedAsset.parent.product?.name})
              </div>
            )}

            <div className="border-t pt-3">
              <p className="text-xs font-bold uppercase text-slate-400 mb-2">Cập nhật nhanh:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="border-green-400 text-green-700 hover:bg-green-50" onClick={() => updateStatus("DEPLOYED")} disabled={loading || scannedAsset.status === "DEPLOYED"}>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Đang dùng
                </Button>
                <Button variant="outline" className="border-blue-400 text-blue-700 hover:bg-blue-50" onClick={() => updateStatus("IN_STOCK")} disabled={loading || scannedAsset.status === "IN_STOCK"}>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Vào kho
                </Button>
                <Button variant="outline" className="border-yellow-400 text-yellow-700 hover:bg-yellow-50" onClick={() => updateStatus("MAINTENANCE")} disabled={loading || scannedAsset.status === "MAINTENANCE"}>
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Bảo trì
                </Button>
                <Button variant="outline" className="border-red-400 text-red-700 hover:bg-red-50" onClick={() => updateStatus("FAULTY")} disabled={loading || scannedAsset.status === "FAULTY"}>
                  <AlertCircle className="w-4 h-4 mr-1.5" /> Báo lỗi
                </Button>
              </div>
              <Button variant="ghost" className="w-full mt-3 text-slate-500" onClick={reset}>
                <RefreshCw className="w-4 h-4 mr-2" /> Quét mã khác
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isScanning && !loading && (
        <p className="text-center text-sm text-slate-400 italic">Đưa camera vào mã QR trên thiết bị</p>
      )}
    </div>
  );
}
