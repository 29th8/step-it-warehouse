"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, Server, Box } from "lucide-react";
import { PrintLabelModal } from "./print-label-modal"; // Re-use từ GĐ7
import { AssetActionMenu } from "./asset-action-menu";

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "Trong kho",
  RESERVED: "Đã giữ",
  INSTALLED: "Đã lắp trong server",
  DEPLOYED: "Đang sử dụng",
  HANDED_OVER: "Đã bàn giao",
  RENTED: "Đang cho thuê",
  MAINTENANCE: "Đang bảo trì",
  FAULTY: "Hỏng",
  DISPOSED: "Thanh lý"
};

interface AssetTableProps {
  data: any[];
  loading?: boolean;
  onRefresh: () => void; // Thêm dòng này
}

export function AssetTable({ data, loading, onRefresh }: AssetTableProps) {
  const [detailAsset, setDetailAsset] = useState<any | null>(null);
  const [detailOpenToken, setDetailOpenToken] = useState(0);

  const openRowDetail = (asset: any) => {
    setDetailAsset(asset);
    setDetailOpenToken((token) => token + 1);
  };

  // Helper hiển thị màu sắc trạng thái
  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      IN_STOCK: "bg-green-100 text-green-800 border-green-200",
      RENTED: "bg-blue-100 text-blue-800 border-blue-200",
      MAINTENANCE: "bg-yellow-100 text-yellow-800 border-yellow-200",
      FAULTY: "bg-red-100 text-red-800 border-red-200",
      DISPOSED: "bg-gray-100 text-gray-800 border-gray-200",
      INSTALLED: "bg-indigo-100 text-indigo-800 border-indigo-200",
      DEPLOYED: "bg-blue-100 text-blue-800 border-blue-200",
      HANDED_OVER: "bg-violet-100 text-violet-800 border-violet-200",
      RESERVED: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
    return variants[status] || "bg-gray-100";
  };

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50">
            <TableHead className="w-[180px] font-bold">Serial Number</TableHead>
            <TableHead className="font-bold">Sản phẩm & Model</TableHead>
            <TableHead className="font-bold">Chủ sở hữu</TableHead>
            <TableHead className="font-bold text-center">Trạng thái</TableHead>
            <TableHead className="font-bold">Vị trí vật lý</TableHead>
            <TableHead className="text-right font-bold">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10">Đang tải dữ liệu...</TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-slate-400 italic">
                Không tìm thấy thiết bị nào phù hợp.
              </TableCell>
            </TableRow>
          ) : (
            data.map((asset) => (
              <TableRow
                key={asset.id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                {/* 1. Serial Number */}
                <TableCell className="font-mono font-bold text-blue-600">
                  <button
                    type="button"
                    onClick={() => openRowDetail(asset)}
                    className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-sm"
                  >
                    {asset.serialNumber}
                  </button>
                </TableCell>

                {/* 2. Thông tin sản phẩm */}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{asset.product.name}</span>
                    <span className="text-xs text-slate-500">{asset.product.modelNumber}</span>
                  </div>
                </TableCell>

                {/* Owner */}
                <TableCell>
                  <span className={asset.owner ? "text-sm text-slate-700" : "text-sm text-slate-400 italic"}>
                    {asset.owner || "Chưa gán"}
                  </span>
                </TableCell>

                {/* 3. Trạng thái (Badge) */}
                <TableCell className="text-center">
                  <Badge variant="outline" className={`${getStatusBadge(asset.status)} whitespace-nowrap`}>
                    {STATUS_LABELS[asset.status] || asset.status}
                  </Badge>
                </TableCell>

                {/* 4. Vị trí */}
                <TableCell>
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin size={12} className="text-slate-400" />
                      {asset.warehouse?.name}
                    </div>
                    {asset.rack && (
                      <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                        <Server size={12} />
                        {asset.rack.name} - U{asset.rackUnit}
                      </div>
                    )}
                    {/* Nếu là linh kiện con, hiển thị nó nằm trong máy nào */}
                    {asset.parentId && (
                      <div className="flex items-center gap-1.5 text-purple-600 italic">
                        <Box size={12} />
                        Trong máy: {asset.parent?.serialNumber}
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-1">
                    <PrintLabelModal asset={asset} />
                    <AssetActionMenu asset={asset} onRefresh={onRefresh} />
                  </div>
                </TableCell>

              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {detailAsset && (
        <AssetActionMenu
          asset={detailAsset}
          onRefresh={onRefresh}
          hideTrigger
          openToken={detailOpenToken}
          onDetailClose={() => setDetailAsset(null)}
        />
      )}
    </div>
  );
}
