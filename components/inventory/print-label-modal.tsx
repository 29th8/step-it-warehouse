"use client";

import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintLabelProps {
  asset: {
    id: string;
    serialNumber: string;
    product: {
      name: string;
      modelNumber: string;
    };
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function PrintLabelModal({ asset, open, onOpenChange, hideTrigger = false }: PrintLabelProps) {
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex gap-2">
          <Printer className="w-4 h-4" /> In Tem
        </Button>
      </DialogTrigger>}
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Xem trước tem nhãn</DialogTitle>
        </DialogHeader>

        {/* VÙNG HIỂN THỊ TEM TRÊN GIAO DIỆN */}
        <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-slate-50 relative">

          {/* ĐÂY LÀ VÙNG SẼ ĐƯỢC IN (PRINT AREA) */}
          <div className="print-page relative bg-white">
            <div className="label">
              <div className="qr">
                <QRCodeSVG
                  value={origin ? `${origin}/assets/${encodeURIComponent(asset.id)}` : asset.serialNumber}
                  size={100}
                  style={{ width: "100%", height: "100%" }}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="label-content text-left text-black">
                <p className="text-[12pt] font-bold truncate uppercase">{asset.product.name}</p>
                <p className="text-[10pt] text-gray-700 truncate mb-4">{asset.product.modelNumber}</p>

                <div className="text-[10pt] mb-4">
                  Serial Number:<br />
                  <strong className="text-[14pt] font-mono tracking-tighter">{asset.serialNumber}</strong>
                </div>

                <small className="text-[8pt] font-black uppercase tracking-widest text-slate-800">
                  STEP IT WAREHOUSE
                </small>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mt-[50mm] italic">
            Kích thước chuẩn: 90mm x 50mm (Dán thiết bị)
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={handlePrint} disabled={!origin} className="bg-blue-600 hover:bg-blue-700">
            Xác nhận lệnh In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
