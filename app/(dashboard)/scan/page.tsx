"use client";

import React, { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Server, MapPin, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner"; // Hoặc dùng alert bình thường

export default function MobileScannerPage() {
  const [scannedAsset, setScannedAsset] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let scanner: Html5QrcodeScanner;

    if (isScanning) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(onScanSuccess, onScanFailure);
    }

    async function onScanSuccess(decodedText: string) {
      // Khi quét thành côngdecodedText chính là Serial Number
      setIsScanning(false);
      scanner.clear();
      await fetchAssetBySN(decodedText);
    }

    function onScanFailure(error: any) {
      // Thường để trống để tránh spam log lỗi khi camera chưa lấy nét được
    }

    return () => {
      if (scanner) scanner.clear();
    };
  }, [isScanning]);

  // Tìm kiếm thông tin Asset từ Serial Number
  const fetchAssetBySN = async (sn: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets`); // Dùng API đã có ở GĐ2
      const allAssets = await res.json();
      const asset = allAssets.find((a: any) => a.serialNumber === sn);
      
      if (asset) {
        setScannedAsset(asset);
      } else {
        alert("Không tìm thấy thiết bị có SN: " + sn);
        setIsScanning(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Hàm cập nhật trạng thái nhanh
  const updateStatus = async (newStatus: string) => {
    if (!scannedAsset) return;
    setLoading(true);
    const res = await fetch(`/api/assets/${scannedAsset.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      alert("Cập nhật thành công!");
      setScannedAsset(null);
      setIsScanning(true);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold text-center">Kiểm kê nhanh QR</h1>

      {/* KHUNG CAMERA */}
      {isScanning && (
        <div className="overflow-hidden rounded-xl border-2 border-blue-500 shadow-lg bg-black">
          <div id="reader" className="w-full"></div>
        </div>
      )}

      {/* KẾT QUẢ QUÉT ĐƯỢC */}
      {scannedAsset && (
        <Card className="animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="bg-slate-50 border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{scannedAsset.product.name}</CardTitle>
                <p className="text-sm font-mono text-blue-600 font-bold">{scannedAsset.serialNumber}</p>
              </div>
              <Badge>{scannedAsset.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{scannedAsset.warehouse.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-400" />
                <span>{scannedAsset.rack?.name || "N/A"} - U{scannedAsset.rackUnit}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-bold uppercase text-slate-500 mb-3">Cập nhật nhanh trạng thái:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  className="border-green-500 text-green-700 hover:bg-green-50"
                  onClick={() => updateStatus("DEPLOYED")}
                  disabled={loading}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Đang dùng
                </Button>
                <Button 
                  variant="outline" 
                  className="border-red-500 text-red-700 hover:bg-red-50"
                  onClick={() => updateStatus("FAULTY")}
                  disabled={loading}
                >
                  <AlertCircle className="w-4 h-4 mr-2" /> Báo lỗi
                </Button>
              </div>
              <Button 
                variant="ghost" 
                className="w-full mt-4 text-slate-500"
                onClick={() => { setScannedAsset(null); setIsScanning(true); }}
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Quét mã khác
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isScanning && (
        <p className="text-center text-sm text-slate-500 italic">
          Đưa camera vào mã QR trên thiết bị để kiểm tra
        </p>
      )}
    </div>
  );
}