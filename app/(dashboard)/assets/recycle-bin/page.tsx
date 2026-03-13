"use client";

import React, { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Trash2, RotateCcw, Search, RefreshCw, AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/common/spinner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSession } from "next-auth/react";

export default function RecycleBinPage() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "ADMIN";
    const router = useRouter();

    const [deletedAssets, setDeletedAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchDeletedAssets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/assets/recycle-bin");
            const data = await res.json();
            setDeletedAssets(Array.isArray(data) ? data : data.data || []);
        } catch (error) {
            toast.error("Lỗi khi tải dữ liệu thùng rác.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDeletedAssets();
    }, [fetchDeletedAssets]);

    const handleRestore = async (id: string, serial: string) => {
        if (!window.confirm(`Bạn có chắc muốn khôi phục thiết bị ${serial}?`)) return;

        setProcessingId(id);
        try {
            const res = await fetch(`/api/assets/${id}/restore`, { method: "PATCH" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Lỗi khôi phục");
            toast.success(data.message || "Khôi phục thành công");
            fetchDeletedAssets();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handlePermanentDelete = async (id: string) => {
        setProcessingId(id);
        try {
            const res = await fetch(`/api/assets/${id}/permanent`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Lỗi xóa vĩnh viễn");
            toast.success(data.message || "Xóa vĩnh viễn thành công");
            fetchDeletedAssets();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredAssets = deletedAssets.filter((asset) => {
        if (!searchQuery) return true;
        const lowerQuery = searchQuery.toLowerCase();
        const matchSN = asset.serialNumber?.toLowerCase().includes(lowerQuery);
        const matchName = asset.product?.name?.toLowerCase().includes(lowerQuery);
        return matchSN || matchName;
    });

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex flex-col gap-1.5">

                    <h1 className="text-3xl font-extrabold flex items-center gap-3 text-red-600 tracking-tight">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.back()}
                            className="rounded-full shadow-sm bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="p-2 bg-red-100/50 rounded-xl border border-red-200/50 shadow-sm">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        Thùng rác
                    </h1>
                    <p className="text-slate-500 font-medium ml-1 mt-1">
                        Chứa các thiết bị đã bị xóa mềm.
                        <span className="text-red-500 ml-1">Lưu ý: Xóa vĩnh viễn không thể khôi phục.</span>
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Tìm theo Serial Number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 w-full bg-white border-slate-200 rounded-xl"
                        />
                    </div>
                    <Button
                        variant="outline"
                        onClick={fetchDeletedAssets}
                        disabled={loading}
                        className="h-11 border-slate-200 rounded-xl bg-white"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Làm mới
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-semibold px-6 py-4">Thiết bị</TableHead>
                            <TableHead className="font-semibold px-6 py-4">Sản phẩm</TableHead>
                            <TableHead className="font-semibold px-6 py-4">Ngày xóa</TableHead>
                            <TableHead className="font-semibold px-6 py-4 text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                    <Spinner size="h-6 w-6 inline mr-2" /> Đang tải thùng rác...
                                </TableCell>
                            </TableRow>
                        ) : filteredAssets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                    {searchQuery ? "Không tìm thấy kết quả" : "Thùng rác trống"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAssets.map((asset) => (
                                <TableRow key={asset.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell className="px-6 py-4">
                                        <span className="font-mono text-slate-900 font-medium">{asset.serialNumber}</span>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-slate-600">
                                        {asset.product?.name}
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-slate-600">
                                        {asset.deletedAt ? format(new Date(asset.deletedAt), "dd/MM/yyyy HH:mm") : "-"}
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-right space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRestore(asset.id, asset.serialNumber)}
                                            disabled={!!processingId}
                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                        >
                                            {processingId === asset.id ? (
                                                <Spinner size="h-4 w-4 mr-1" color="text-green-600" />
                                            ) : (
                                                <RotateCcw className="w-4 h-4 mr-1" />
                                            )}

                                        </Button>

                                        {isAdmin && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        disabled={!!processingId}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="max-w-md">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                                            <AlertTriangle className="w-5 h-5" />
                                                            Xóa vĩnh viễn thiết bị?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription className="text-base text-slate-600 mt-2">
                                                            Bạn có chắc chắn muốn xóa vĩnh viễn thiết bị <strong className="text-slate-900">{asset.serialNumber}</strong>?
                                                            <br /><br />
                                                            <span className="text-red-500 font-medium">Lưu ý: Hành động này không thể hoàn tác. Lịch sử của thiết bị sẽ còn trong System History nhưng chi tiết thiết bị sẽ biến mất vĩnh viễn. Đảm bảo thiết bị đã không còn hợp đồng thuê hoạt động.</span>
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="mt-6">
                                                        <AlertDialogCancel className="border-slate-200">Hủy</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handlePermanentDelete(asset.id)}
                                                            className="bg-red-600 hover:bg-red-700 text-white"
                                                        >
                                                            Xác nhận xóa
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
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
