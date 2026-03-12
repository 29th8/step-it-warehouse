"use client";

import React, { useState } from "react";
import Link from "next/link"; // <--- THÊM IMPORT NÀY
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreHorizontal, Plus, Edit, Trash, Server, Loader2 } from "lucide-react";
import { handleApiResponse } from "@/lib/api-handler";
import { RackFormDialog } from "./rack-form-dialog";

interface Rack { id: string; name: string; type?: string; totalUnits: number | null; _count: { assets: number }; }
interface RackTableProps {
    racks: Rack[];
    warehouseId: string;
    onRefresh: () => void;
}

export function RackTable({ racks, warehouseId, onRefresh }: RackTableProps) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRack, setEditingRack] = useState<Rack | undefined>(undefined);

    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [deletingRack, setDeletingRack] = useState<Rack | undefined>(undefined);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleEdit = (rack: Rack) => {
        setEditingRack(rack);
        setIsFormOpen(true);
    };

    const handleCreate = () => {
        setEditingRack(undefined);
        setIsFormOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingRack) return;
        setIsDeleting(true);
        try {
            const res = await fetch("/api/racks", {
                method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deletingRack.id }),
            });
            await handleApiResponse(res, "Đã xóa tủ rack thành công.");
            onRefresh();
        } catch (e: any) {
            toast.error(e.message, { duration: 5000 });
        } finally {
            setIsDeleting(false);
            setIsDeleteAlertOpen(false);
        }
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button size="sm" onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <Plus className="mr-2 h-4 w-4" /> Thêm Tủ Rack
                </Button>
            </div>
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/70">
                        <TableRow>
                            <TableHead>Tên Tủ Rack</TableHead>
                            <TableHead>Loại tủ</TableHead>
                            <TableHead className="text-center">Số U</TableHead>
                            <TableHead className="text-center">Số thiết bị</TableHead>
                            <TableHead className="text-right w-20">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {racks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-400 italic">
                                    Chưa có tủ rack nào trong kho này.
                                </TableCell>
                            </TableRow>
                        ) : (
                            racks.map(rack => (
                                <TableRow key={rack.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-medium text-blue-600">
                                        <Link href={`/racks/${rack.id}`} className="hover:underline">
                                            {rack.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={rack.type === "STORAGE" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                                            {rack.type === "STORAGE" ? "📦 Lưu trữ" : "🏢 Datacenter"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">{rack.totalUnits ? `${rack.totalUnits}U` : "—"}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                            <Server className="mr-1.5 h-3 w-3 text-slate-500" /> {rack._count.assets}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100"><MoreHorizontal size={16} /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-white z-50 shadow-md border-slate-200">
                                                <DropdownMenuItem onClick={() => handleEdit(rack)} className="cursor-pointer gap-2">
                                                    <Edit className="h-4 w-4 text-green-600" /> Sửa
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => { setDeletingRack(rack); setIsDeleteAlertOpen(true); }} className="cursor-pointer gap-2 text-red-600 focus:text-red-700 focus:bg-red-50">
                                                    <Trash className="h-4 w-4" /> Xóa
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <RackFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSuccess={onRefresh}
                warehouseId={warehouseId}
                initialData={editingRack}
            />

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600">Xác nhận xóa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn sắp xóa tủ rack: <strong>{deletingRack?.name}</strong>. Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="animate-spin mr-2" />} Đồng ý Xóa
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}