"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Server, Grid3x3, MapPin } from "lucide-react";
import { WarehouseActionMenu } from "../warehouse/warehouse-action-menu";

type WarehouseRow = {
  id: string;
  name: string;
  location?: string | null;
  _count?: {
    racks?: number;
    assets?: number;
  };
};

interface WarehouseTableProps {
  data: WarehouseRow[];
  onRefresh: () => void;
}

export function WarehouseTable({ data, onRefresh }: WarehouseTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="md:hidden">
        {data.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">Không có dữ liệu.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.map((warehouse) => (
              <article key={warehouse.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{warehouse.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{warehouse.location || "Chưa cập nhật vị trí"}</span>
                    </p>
                  </div>
                  <WarehouseActionMenu warehouse={warehouse} onRefresh={onRefresh} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 gap-1.5 font-medium">
                    <Grid3x3 className="w-3.5 h-3.5" /> {warehouse._count?.racks || 0} Racks
                  </Badge>
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 gap-1.5 font-medium">
                    <Server className="w-3.5 h-3.5" /> {warehouse._count?.assets || 0} Thiết bị
                  </Badge>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:block">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="font-bold">Tên Kho</TableHead>
            <TableHead className="font-bold">Vị trí</TableHead>
            <TableHead className="font-bold text-center">Thống kê</TableHead>
            <TableHead className="text-right font-bold w-[100px]">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center h-24 text-slate-400">Không có dữ liệu.</TableCell></TableRow>
          ) : (
            data.map((warehouse) => (
              <TableRow key={warehouse.id} className="hover:bg-slate-50/50">
                <TableCell className="font-bold text-slate-800 text-base">{warehouse.name}</TableCell>
                <TableCell className="text-slate-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  {warehouse.location || <span className="italic text-slate-400">Chưa cập nhật</span>}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-4">
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 gap-1.5 font-medium"><Grid3x3 className="w-3.5 h-3.5" /> {warehouse._count?.racks || 0} Racks</Badge>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 gap-1.5 font-medium"><Server className="w-3.5 h-3.5" /> {warehouse._count?.assets || 0} Thiết bị</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <WarehouseActionMenu warehouse={warehouse} onRefresh={onRefresh} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
