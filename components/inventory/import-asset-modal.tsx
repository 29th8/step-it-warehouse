"use client";

import React, { useState, useRef } from "react";
import { toast } from "sonner";
import {
    UploadCloud, FileSpreadsheet, X, CheckCircle2, AlertTriangle,
    Loader2, ChevronRight, Play, Download, Upload
} from "lucide-react";
import { handleApiResponse } from "@/lib/api-handler";
import * as XLSX from "xlsx-js-style";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ImportAssetProps {
    onRefresh: () => void;
}

export function ImportAssetModal({ onRefresh }: ImportAssetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Data states
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<{
        validRows: any[];
        invalidRows: any[];
        total: number;
    } | null>(null);

    // Loading states
    const [isProcessing, setIsProcessing] = useState(false);
    const [importProgress, setImportProgress] = useState(0);

    const resetState = () => {
        setStep(1);
        setFile(null);
        setPreviewData(null);
        setIsProcessing(false);
        setImportProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setTimeout(resetState, 200);
        }
    };

    // STEP 1: Handle File Selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith(".xlsx")) {
            toast.error("Vui lòng chọn file Excel định dạng .xlsx");
            return;
        }

        setFile(selectedFile);
        await processPreview(selectedFile);
    };

    // Process Preview via API
    const processPreview = async (selectedFile: File) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("preview", "true"); // Kích hoạt chế độ Preview

            const res = await fetch("/api/assets/import", {
                method: "POST",
                body: formData,
            });

            const data = await handleApiResponse(res);
            setPreviewData({
                validRows: data.validRows,
                invalidRows: data.invalidRows,
                total: data.totalProcessed,
            });
            setStep(2); // Chuyển sang bước Preview
        } catch (error: any) {
            toast.error(error.message);
            setFile(null);
        } finally {
            setIsProcessing(false);
        }
    };

    // STEP 2: Execute Real Import
    const handleExecuteImport = async () => {
        if (!file) return;

        setIsProcessing(true);
        setStep(3); // Chuyển sang bước Progress

        // Giả lập Progress Bar chạy trong lúc chờ API (Thực tế là fetch)
        // Vì API fetch một lúc, ta cập nhật progress ảo cho UX
        let progressInterval = setInterval(() => {
            setImportProgress(prev => {
                const inc = prev + Math.random() * 15;
                return inc >= 90 ? 90 : inc; // Dừng ở 90% đợi API
            });
        }, 500);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("preview", "false"); // Execute

            const res = await fetch("/api/assets/import", {
                method: "POST",
                body: formData,
            });

            const data = await handleApiResponse(res);

            clearInterval(progressInterval);
            setImportProgress(100);

            toast.success(`Đã import thành công ${data.successCount} thiết bị!`);

            if (data.failedRows && data.failedRows.length > 0) {
                toast.warning(`Có ${data.failedRows.length} dòng bị lỗi DB. Vui lòng tải file lỗi.`);
                setPreviewData(prev => prev ? { ...prev, invalidRows: data.failedRows } : null);
                setStep(2); // Quay lại để tải file lỗi
            } else {
                setTimeout(() => {
                    setIsOpen(false);
                    onRefresh();
                }, 1000);
            }

        } catch (error: any) {
            clearInterval(progressInterval);
            toast.error(error.message);
            setStep(2); // Quay lại Preview nếu lỗi mạng
        } finally {
            setIsProcessing(false);
        }
    };

    // Download Error Report
    const downloadErrorReport = () => {
        if (!previewData || previewData.invalidRows.length === 0) return;

        const ws = XLSX.utils.json_to_sheet(previewData.invalidRows.map(row => ({
            "Dòng (Row)": row.row,
            "Serial Number": row.serialNumber,
            "Lý do lỗi (Error)": row.error
        })));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Errors");
        XLSX.writeFile(wb, `Import_Errors_${new Date().getTime()}.xlsx`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="bg-white border-slate-200 hover:bg-slate-50 shadow-sm text-slate-700">
                    <Upload className="w-4 h-4 mr-2 text-indigo-500" />
                    Import Excel
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-white border-none shadow-xl">
                <DialogHeader className="p-6 pb-4 border-b bg-slate-50">
                    <DialogTitle className="flex items-center gap-2 text-xl text-slate-800">
                        <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                        Nhập Dữ Liệu Thiết Bị - Nâng Cao
                    </DialogTitle>

                    {/* Progress Steps Header */}
                    <div className="flex items-center gap-2 mt-4 text-sm font-medium">
                        <Badge variant={step >= 1 ? "default" : "outline"} className={step >= 1 ? "bg-indigo-600" : "text-slate-400"}>1. Tải File</Badge>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                        <Badge variant={step >= 2 ? "default" : "outline"} className={step >= 2 ? "bg-indigo-600" : "text-slate-400"}>2. Xem Trước</Badge>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                        <Badge variant={step === 3 ? "default" : "outline"} className={step === 3 ? "bg-indigo-600" : "text-slate-400"}>3. Thực Thi</Badge>
                    </div>
                </DialogHeader>

                <div className="p-6">
                    {/* ================= STEP 1: UPLOAD ================= */}
                    {step === 1 && (
                        <div className="animate-in fade-in zoom-in-95 duration-300">
                            <div
                                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors
                  ${isProcessing ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 cursor-pointer'}
                `}
                                onClick={() => !isProcessing && fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    accept=".xlsx"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                />

                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                                        <h3 className="text-lg font-semibold text-slate-800">Đang phân tích dữ liệu...</h3>
                                        <p className="text-sm text-slate-500 mt-2">Đang kiểm tra tính hợp lệ của Excel với Database</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                                            <UploadCloud className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Bấm để chọn file Excel (.xlsx)</h3>
                                        <p className="text-sm text-slate-500 max-w-sm">
                                            Hệ thống hỗ trợ file chứa lên tới hàng chục nghìn dòng. Quá trình kiểm tra sẽ tự động loại bỏ các thiết bị trùng lặp.
                                        </p>
                                    </>
                                )}
                            </div>

                            {!isProcessing && (
                                <div className="mt-4 flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800">
                                    <p><strong>Lưu ý:</strong> Vui lòng sử dụng Template chuẩn để tránh lỗi Format.</p>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="text-blue-700 h-auto p-0 font-bold"
                                        onClick={() => window.open("/api/assets/import-template", "_blank")}
                                    >
                                        Tải Template Mẫu
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ================= STEP 2: PREVIEW ================= */}
                    {step === 2 && previewData && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border flex flex-col items-center justify-center">
                                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Tổng Dòng</p>
                                    <p className="text-2xl font-black text-slate-800">{previewData.total}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-xl border border-green-200 flex flex-col items-center justify-center">
                                    <p className="text-green-600 text-xs font-bold uppercase mb-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Hợp Lệ</p>
                                    <p className="text-2xl font-black text-green-700">{previewData.validRows.length}</p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex flex-col items-center justify-center">
                                    <p className="text-red-600 text-xs font-bold uppercase mb-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Lỗi</p>
                                    <p className="text-2xl font-black text-red-700">{previewData.invalidRows.length}</p>
                                </div>
                            </div>

                            {previewData.invalidRows.length > 0 && (
                                <div className="bg-red-50/50 border border-red-200 rounded-xl overflow-hidden">
                                    <div className="bg-red-100/50 p-3 border-b border-red-200 flex justify-between items-center">
                                        <p className="text-sm font-bold text-red-800 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" /> Chi tiết các dòng bị Lỗi ({previewData.invalidRows.length})
                                        </p>
                                        <Button size="sm" variant="outline" className="h-8 bg-white text-red-700 border-red-200 hover:bg-red-50" onClick={downloadErrorReport}>
                                            <Download className="w-3.5 h-3.5 mr-1" /> Xuất File Lỗi
                                        </Button>
                                    </div>
                                    <ScrollArea className="h-[200px]">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-white/50 text-xs text-red-900 sticky top-0 shadow-sm font-semibold">
                                                <tr>
                                                    <th className="px-4 py-2 w-16 text-center">Dòng</th>
                                                    <th className="px-4 py-2 w-32 border-l border-red-100">Serial</th>
                                                    <th className="px-4 py-2 border-l border-red-100">Chi tiết Lỗi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.invalidRows.map((err, idx) => (
                                                    <tr key={idx} className="border-b border-red-100/50 hover:bg-red-50/80 transition-colors">
                                                        <td className="px-4 py-2 text-center text-red-900/60 font-mono text-xs">{err.row}</td>
                                                        <td className="px-4 py-2 border-l border-red-100/50 font-medium text-red-900">{err.serialNumber}</td>
                                                        <td className="px-4 py-2 border-l border-red-100/50 text-red-800">{err.error}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </ScrollArea>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t">
                                <Button variant="ghost" onClick={resetState} className="text-slate-500">
                                    <X className="w-4 h-4 mr-2" /> Hủy & Tải Lại File
                                </Button>

                                <Button
                                    onClick={handleExecuteImport}
                                    disabled={previewData.validRows.length === 0}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                                >
                                    <Play className="w-4 h-4 mr-2" />
                                    Thực thi Import ({previewData.validRows.length} hợp lệ)
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ================= STEP 3: EXECUTE PROGRESS ================= */}
                    {step === 3 && (
                        <div className="py-12 flex flex-col items-center justify-center space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-center">
                            <div className="relative">
                                <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-indigo-700">
                                    {Math.round(importProgress)}%
                                </div>
                            </div>

                            <div className="space-y-2 w-full max-w-sm">
                                <h3 className="text-xl font-bold text-slate-800">Đang lưu vào Database...</h3>
                                <p className="text-slate-500 text-sm">Quá trình này có thể mất vài phút với dữ liệu lớn.</p>
                                <Progress value={importProgress} className="h-2 bg-indigo-100" />
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
