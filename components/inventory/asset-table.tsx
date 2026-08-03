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
import { Box, MapPin, Package, Server, UserRound } from "lucide-react";
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

export type AssetTableRow = {
  id: string;
  serialNumber: string;
  owner?: string | null;
  status: string;
  parentId?: string | null;
  rackUnit?: number | null;
  product: {
    name: string;
    modelNumber: string;
    productCategory?: {
      name?: string | null;
      isMain?: boolean | null;
    } | null;
  };
  warehouse?: { name?: string | null } | null;
  rack?: { name?: string | null } | null;
  parent?: { serialNumber?: string | null } | null;
};

interface AssetTableProps {
  data: AssetTableRow[];
  loading?: boolean;
  onRefresh: () => void; // Thêm dòng này
}

export function AssetTable({ data, loading, onRefresh }: AssetTableProps) {
  const [detailAsset, setDetailAsset] = useState<AssetTableRow | null>(null);
  const [detailOpenToken, setDetailOpenToken] = useState(0);

  const openRowDetail = (asset: AssetTableRow) => {
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
    <div className="bg-white">
      <div className="md:hidden">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">Đang tải dữ liệu...</div>
        ) : data.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm italic text-slate-400">
            Không tìm thấy thiết bị nào phù hợp.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.map((asset) => (
              <article key={asset.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => openRowDetail(asset)}
                      className="block max-w-full truncate rounded-sm text-left font-mono text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      {asset.serialNumber}
                    </button>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                      {asset.product?.name || "Chưa có sản phẩm"}
                    </p>
                    <p className="truncate text-xs text-slate-500">{asset.product?.modelNumber}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <PrintLabelModal asset={asset} />
                    <AssetActionMenu asset={asset} onRefresh={onRefresh} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`${getStatusBadge(asset.status)} whitespace-nowrap`}>
                    {STATUS_LABELS[asset.status] || asset.status}
                  </Badge>
                  {asset.product?.productCategory?.name && (
                    <Badge variant="outline" className="bg-slate-50 text-slate-600">
                      <Package className="h-3 w-3" />
                      {asset.product.productCategory.name}
                    </Badge>
                  )}
                </div>

                <div className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <UserRound className="h-3.5 w-3.5 text-slate-400" />
                    <span className={asset.owner ? "font-medium text-slate-700" : "italic text-slate-400"}>
                      {asset.owner || "Chưa gán chủ sở hữu"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span className="min-w-0 truncate">{asset.warehouse?.name || "Chưa có vị trí kho"}</span>
                  </div>
                  {asset.rack && (
                    <div className="flex items-center gap-2 font-medium text-blue-600">
                      <Server className="h-3.5 w-3.5" />
                      <span className="min-w-0 truncate">
                        {asset.rack.name}
                        {asset.product?.productCategory?.isMain === true && asset.rackUnit ? ` - U${asset.rackUnit}` : ""}
                      </span>
                    </div>
                  )}
                  {asset.parentId && (
                    <div className="flex items-center gap-2 italic text-purple-600">
                      <Box className="h-3.5 w-3.5" />
                      <span className="min-w-0 truncate">Trong máy: {asset.parent?.serialNumber}</span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:block">
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
                        {asset.rack.name}
                        {asset.product?.productCategory?.isMain === true && asset.rackUnit ? ` - U${asset.rackUnit}` : ""}
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
      </div>
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
