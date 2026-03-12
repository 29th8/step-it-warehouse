"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Server, Grid3x3, MapPin } from "lucide-react";
import { WarehouseActionMenu } from "../warehouse/warehouse-action-menu";

interface WarehouseTableProps {
  data: any[];
  onRefresh: () => void;
}

export function WarehouseTable({ data, onRefresh }: WarehouseTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
            data.map((warehouse: any) => (
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
  );
}