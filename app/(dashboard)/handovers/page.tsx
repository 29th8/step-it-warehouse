"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ClipboardList, Plus, Search, RefreshCw, Printer,
  CheckCircle2, Clock, Loader2, X, Trash2, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function printHandover(r: any) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) { alert("Vui lòng cho phép popup để in"); return; }

  const items = r.items?.map((item: any, idx: number) => `
    <tr>
      <td style="border:1px solid #cbd5e1;padding:8px;text-align:center">${idx + 1}</td>
      <td style="border:1px solid #cbd5e1;padding:8px;font-weight:600">${item.asset?.product?.name || ""}</td>
      <td style="border:1px solid #cbd5e1;padding:8px;font-family:monospace;font-size:12px">${item.asset?.serialNumber || ""}</td>
      <td style="border:1px solid #cbd5e1;padding:8px;color:#64748b">${item.asset?.warehouse?.name || "—"}</td>
      <td style="border:1px solid #cbd5e1;padding:8px">${item.note || ""}</td>
    </tr>`).join("") || "";

  const expectedReturn = r.expectedReturn
    ? `<tr><td style="color:#64748b;padding:4px 0">Ngày dự kiến trả:</td><td style="font-weight:600;padding:4px 8px">${format(new Date(r.expectedReturn), "dd/MM/yyyy")}</td></tr>` : "";

  win.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <title>Biên bản Bàn giao - ${r.code}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; background: white; padding: 32px; }
    h1 { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
    h2 { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
    .sig-box { text-align: center; }
    .sig-line { border-bottom: 1px dashed #94a3b8; margin: 48px 8px 8px; }
    @media print { body { padding: 16px; } button { display: none; } }
  </style>
</head>
<body>
  <div style="text-align:center;border-bottom:2px solid #e2e8f0;padding-bottom:20px;margin-bottom:20px">
    <p style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px">CÔNG TY STEP IT</p>
    <h1 style="margin-top:8px">BIÊN BẢN BÀN GIAO VẬT TƯ / THIẾT BỊ</h1>
    <p style="color:#64748b;margin-top:6px;font-size:12px">Mã biên bản: <strong style="font-family:monospace;color:#1e293b">${r.code}</strong> &nbsp;|&nbsp; Ngày: <strong>${format(new Date(r.handoverDate), "dd/MM/yyyy")}</strong></p>
  </div>

  <table style="margin-bottom:20px;border:none">
    <tr>
      <td style="width:50%;padding:4px 0;vertical-align:top">
        <table style="width:100%;border:none">
          <tr><td style="color:#64748b;padding:4px 0;width:140px">Người bàn giao:</td><td style="font-weight:600;padding:4px 8px">${r.user?.name || "—"}</td></tr>
          <tr><td style="color:#64748b;padding:4px 0">Bộ phận:</td><td style="font-weight:600;padding:4px 8px">${r.department}</td></tr>
          <tr><td style="color:#64748b;padding:4px 0">Người duyệt:</td><td style="font-weight:600;padding:4px 8px">${r.supervisorName}</td></tr>
        </table>
      </td>
      <td style="width:50%;padding:4px 0;vertical-align:top;padding-left:24px">
        <table style="width:100%;border:none">
          <tr><td style="color:#64748b;padding:4px 0;width:140px">Người nhận:</td><td style="font-weight:600;padding:4px 8px">${r.recipientName}</td></tr>
          ${expectedReturn}
          <tr><td style="color:#64748b;padding:4px 0">Mục đích:</td><td style="font-weight:600;padding:4px 8px">${r.purpose}</td></tr>
          ${r.note ? `<tr><td style="color:#64748b;padding:4px 0">Ghi chú:</td><td style="padding:4px 8px">${r.note}</td></tr>` : ""}
        </table>
      </td>
    </tr>
  </table>

  <h2>Danh sách vật tư / thiết bị bàn giao</h2>
  <table>
    <thead>
      <tr>
        <th style="width:40px">STT</th>
        <th>Tên thiết bị</th>
        <th>Serial Number</th>
        <th>Vị trí kho</th>
        <th>Ghi chú</th>
      </tr>
    </thead>
    <tbody>${items}</tbody>
  </table>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:48px;padding-top:24px;border-top:1px solid #e2e8f0">
    <div class="sig-box"><p style="font-weight:600;font-size:12px;text-transform:uppercase">Người duyệt</p><div class="sig-line"></div><p style="font-size:11px;color:#64748b">Ký & ghi rõ họ tên</p><p style="font-weight:600;font-size:12px;margin-top:4px">${r.supervisorName}</p></div>
    <div class="sig-box"><p style="font-weight:600;font-size:12px;text-transform:uppercase">Người bàn giao</p><div class="sig-line"></div><p style="font-size:11px;color:#64748b">Ký & ghi rõ họ tên</p><p style="font-weight:600;font-size:12px;margin-top:4px">${r.user?.name || ""}</p></div>
    <div class="sig-box"><p style="font-weight:600;font-size:12px;text-transform:uppercase">Người nhận</p><div class="sig-line"></div><p style="font-size:11px;color:#64748b">Ký & ghi rõ họ tên</p><p style="font-weight:600;font-size:12px;margin-top:4px">${r.recipientName}</p></div>
  </div>

  <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:24px;padding-top:12px;border-top:1px solid #f1f5f9">
    Biên bản được lập thành 02 bản, mỗi bên giữ 01 bản. — Ngày in: ${format(new Date(), "dd/MM/yyyy HH:mm")}
  </p>

  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`);
  win.document.close();
}

export default function HandoversPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    recipientName: "", department: "", purpose: "",
    supervisorName: "", handoverDate: format(new Date(), "yyyy-MM-dd"),
    expectedReturn: "", note: ""
  });
  const [assetSearch, setAssetSearch] = useState("");
  const [assetResults, setAssetResults] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [isSearchingAsset, setIsSearchingAsset] = useState(false);

  // Print + return state
  const [printRecord, setPrintRecord] = useState<any | null>(null);
  const [returnConfirmId, setReturnConfirmId] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (search) params.append("search", search);
      const res = await fetch(`/api/handovers?${params}`);
      const json = await res.json();
      setRecords(Array.isArray(json) ? json : []);
    } catch { toast.error("Lỗi tải dữ liệu"); }
    finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchRecords, 350);
    return () => clearTimeout(t);
  }, [fetchRecords]);

  // Search available assets
  useEffect(() => {
    if (!assetSearch.trim()) { setAssetResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearchingAsset(true);
      try {
        const res = await fetch(`/api/assets?search=${encodeURIComponent(assetSearch)}&pageSize=20&page=1`);
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.data || [];
        setAssetResults(list.filter((a: any) => a.status === "IN_STOCK" && !selectedAssets.find(s => s.id === a.id)));
      } catch { setAssetResults([]); }
      finally { setIsSearchingAsset(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [assetSearch, selectedAssets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAssets.length === 0) return toast.error("Vui lòng chọn ít nhất 1 thiết bị");
    if (!form.recipientName || !form.department || !form.purpose || !form.supervisorName)
      return toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");

    setIsSaving(true);
    try {
      const res = await fetch("/api/handovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, assetIds: selectedAssets.map(a => a.id) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Đã tạo biên bản ${data.code}`);
      setIsCreateOpen(false);
      setSelectedAssets([]); setAssetSearch("");
      setForm({ recipientName: "", department: "", purpose: "", supervisorName: "", handoverDate: format(new Date(), "yyyy-MM-dd"), expectedReturn: "", note: "" });
      fetchRecords();
      setTimeout(() => { setPrintRecord(data); printHandover(data); }, 300);
    } catch (err: any) { toast.error(err.message); }
    finally { setIsSaving(false); }
  };

  const handleReturn = async (id: string) => {
    setIsReturning(true);
    try {
      const res = await fetch(`/api/handovers/${id}/return`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setReturnConfirmId(null);
      fetchRecords();
    } catch (err: any) { toast.error(err.message); }
    finally { setIsReturning(false); }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <ClipboardList className="w-6 h-6 text-blue-600" /> Biên bản Bàn giao Vật tư
          </h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý việc xuất vật tư cho các bộ phận, in biên bản ký xác nhận.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Tạo Biên bản mới
        </Button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Tìm mã BB, tên người nhận, bộ phận..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px] bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="ACTIVE">Đang mang đi</SelectItem>
            <SelectItem value="RETURNED">Đã hoàn trả</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchRecords} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold">Mã biên bản</TableHead>
              <TableHead className="font-bold">Người nhận / Bộ phận</TableHead>
              <TableHead className="font-bold">Mục đích</TableHead>
              <TableHead className="font-bold">Số vật tư</TableHead>
              <TableHead className="font-bold">Ngày bàn giao</TableHead>
              <TableHead className="font-bold">Dự kiến trả</TableHead>
              <TableHead className="font-bold">Trạng thái</TableHead>
              <TableHead className="text-right font-bold">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600" /></TableCell></TableRow>
            ) : records.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-400">Chưa có biên bản nào.</TableCell></TableRow>
            ) : records.map(r => (
              <TableRow key={r.id} className="hover:bg-slate-50/50">
                <TableCell className="font-mono font-bold text-blue-600">{r.code}</TableCell>
                <TableCell>
                  <p className="font-semibold">{r.recipientName}</p>
                  <p className="text-xs text-slate-400">{r.department}</p>
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-slate-600">{r.purpose}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.items.length} thiết bị</Badge>
                </TableCell>
                <TableCell className="text-slate-600">{format(new Date(r.handoverDate), "dd/MM/yyyy")}</TableCell>
                <TableCell className="text-slate-600">
                  {r.expectedReturn ? format(new Date(r.expectedReturn), "dd/MM/yyyy") : <span className="text-slate-300 italic">—</span>}
                </TableCell>
                <TableCell>
                  {r.status === "ACTIVE"
                    ? <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" />Đang mang đi</Badge>
                    : <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Đã hoàn trả</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600" onClick={() => printHandover(r)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                    {r.status === "ACTIVE" && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setReturnConfirmId(r.id)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Xác nhận trả
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* CREATE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-white sm:max-w-[700px] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-slate-50">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ClipboardList className="w-5 h-5 text-blue-600" /> Tạo Biên bản Bàn giao mới
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* THÔNG TIN BÀN GIAO */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Người nhận *</label>
                  <Input placeholder="VD: Nguyễn Văn A" value={form.recipientName} onChange={e => setForm({ ...form, recipientName: e.target.value })} className="bg-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Bộ phận *</label>
                  <Input placeholder="VD: Kinh doanh, IT, Marketing..." value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="bg-white" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Mục đích sử dụng *</label>
                  <Input placeholder="VD: Demo sản phẩm cho khách hàng ABC, Hội nghị 20/11..." value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} className="bg-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Người duyệt / Sếp ký *</label>
                  <Input placeholder="VD: Trần Thị B" value={form.supervisorName} onChange={e => setForm({ ...form, supervisorName: e.target.value })} className="bg-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Ngày bàn giao</label>
                  <Input type="date" value={form.handoverDate} onChange={e => setForm({ ...form, handoverDate: e.target.value })} className="bg-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Ngày dự kiến trả</label>
                  <Input type="date" value={form.expectedReturn} onChange={e => setForm({ ...form, expectedReturn: e.target.value })} className="bg-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Ghi chú</label>
                  <Input placeholder="Ghi chú thêm nếu có..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="bg-white" />
                </div>
              </div>

              {/* CHỌN VẬT TƯ */}
              <div className="space-y-3 border-t pt-4">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" /> Vật tư bàn giao *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Tìm thiết bị (Serial Number, tên)..."
                    value={assetSearch}
                    onChange={e => setAssetSearch(e.target.value)}
                    className="pl-9 bg-white"
                  />
                </div>

                {/* Kết quả tìm kiếm */}
                {assetResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-40 overflow-y-auto shadow-sm">
                    {assetResults.map(a => (
                      <div key={a.id} className="flex justify-between items-center px-3 py-2 hover:bg-blue-50 cursor-pointer" onClick={() => {
                        setSelectedAssets(prev => [...prev, a]);
                        setAssetSearch("");
                        setAssetResults([]);
                      }}>
                        <div>
                          <p className="text-sm font-semibold">{a.product.name}</p>
                          <p className="text-xs font-mono text-slate-500">{a.serialNumber}</p>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-200 text-xs">Trong kho</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {isSearchingAsset && <p className="text-xs text-slate-400 italic">Đang tìm...</p>}

                {/* Danh sách đã chọn */}
                {selectedAssets.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Đã chọn ({selectedAssets.length})</p>
                    {selectedAssets.map(a => (
                      <div key={a.id} className="flex justify-between items-center bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{a.product.name}</p>
                          <p className="text-xs font-mono text-slate-500">{a.serialNumber}</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 h-7 w-7 p-0"
                          onClick={() => setSelectedAssets(prev => prev.filter(x => x.id !== a.id))}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {selectedAssets.length === 0 && (
                  <p className="text-sm text-slate-400 italic text-center py-3 border border-dashed rounded-lg">Chưa có vật tư nào được chọn</p>
                )}
              </div>
            </div>

            <DialogFooter className="p-4 border-t bg-slate-50 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardList className="w-4 h-4 mr-2" />}
                {isSaving ? "Đang tạo..." : "Tạo & In Biên bản"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RETURN CONFIRM */}
      <AlertDialog open={!!returnConfirmId} onOpenChange={open => !open && setReturnConfirmId(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hoàn trả vật tư?</AlertDialogTitle>
            <AlertDialogDescription>
              Xác nhận tất cả vật tư trong biên bản này đã được trả lại kho. Trạng thái các thiết bị sẽ chuyển về <strong>Trong kho</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => returnConfirmId && handleReturn(returnConfirmId)}
              disabled={isReturning}
            >
              {isReturning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Xác nhận hoàn trả
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PRINT DIALOG */}
      {printRecord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden" onClick={() => setPrintRecord(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b print:hidden">
              <div>
                <h2 className="font-bold text-lg">Biên bản Bàn giao</h2>
                <p className="text-sm text-slate-500">{printRecord.code}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => printHandover(printRecord)} className="bg-blue-600 text-white">
                  <Printer className="w-4 h-4 mr-2" /> In / Xuất PDF
                </Button>
                <Button variant="outline" onClick={() => setPrintRecord(null)}>Đóng</Button>
              </div>
            </div>

            {/* NỘI DUNG BIÊN BẢN */}
            <div id="print-area" className="p-10 space-y-6 text-sm">
              {/* HEADER */}
              <div className="text-center space-y-1 border-b pb-6">
                <p className="font-bold text-base uppercase tracking-wide">CÔNG TY STEP IT</p>
                <h1 className="text-xl font-bold uppercase tracking-widest mt-2">BIÊN BẢN BÀN GIAO VẬT TƯ / THIẾT BỊ</h1>
                <p className="text-slate-500 text-sm">Mã biên bản: <strong className="text-slate-800 font-mono">{printRecord.code}</strong></p>
                <p className="text-slate-500 text-sm">Ngày: {format(new Date(printRecord.handoverDate), "dd/MM/yyyy")}</p>
              </div>

              {/* THÔNG TIN */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <span className="text-slate-500">Người bàn giao:</span>
                  <span className="ml-2 font-semibold">{printRecord.user?.name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Người nhận:</span>
                  <span className="ml-2 font-semibold">{printRecord.recipientName}</span>
                </div>
                <div>
                  <span className="text-slate-500">Bộ phận:</span>
                  <span className="ml-2 font-semibold">{printRecord.department}</span>
                </div>
                <div>
                  <span className="text-slate-500">Người duyệt:</span>
                  <span className="ml-2 font-semibold">{printRecord.supervisorName}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Mục đích:</span>
                  <span className="ml-2 font-semibold">{printRecord.purpose}</span>
                </div>
                {printRecord.expectedReturn && (
                  <div>
                    <span className="text-slate-500">Dự kiến trả:</span>
                    <span className="ml-2 font-semibold">{format(new Date(printRecord.expectedReturn), "dd/MM/yyyy")}</span>
                  </div>
                )}
                {printRecord.note && (
                  <div className="col-span-2">
                    <span className="text-slate-500">Ghi chú:</span>
                    <span className="ml-2">{printRecord.note}</span>
                  </div>
                )}
              </div>

              {/* DANH SÁCH VẬT TƯ */}
              <div>
                <h3 className="font-bold text-slate-800 mb-3 uppercase text-xs tracking-wider">Danh sách vật tư / thiết bị bàn giao</h3>
                <table className="w-full border border-slate-300 text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-2 text-left w-8">STT</th>
                      <th className="border border-slate-300 p-2 text-left">Tên thiết bị</th>
                      <th className="border border-slate-300 p-2 text-left">Serial Number</th>
                      <th className="border border-slate-300 p-2 text-left">Vị trí kho</th>
                      <th className="border border-slate-300 p-2 text-left">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printRecord.items?.map((item: any, idx: number) => (
                      <tr key={item.id}>
                        <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-medium">{item.asset?.product?.name}</td>
                        <td className="border border-slate-300 p-2 font-mono text-xs">{item.asset?.serialNumber}</td>
                        <td className="border border-slate-300 p-2 text-slate-600">{item.asset?.warehouse?.name || "—"}</td>
                        <td className="border border-slate-300 p-2">{item.note || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* KHU VỰC KÝ TÊN */}
              <div className="grid grid-cols-3 gap-6 pt-10 mt-8 border-t">
                {[
                  { title: "Người duyệt", sub: printRecord.supervisorName },
                  { title: "Người bàn giao", sub: printRecord.user?.name },
                  { title: "Người nhận", sub: printRecord.recipientName },
                ].map((s, i) => (
                  <div key={i} className="text-center space-y-8">
                    <p className="font-semibold text-slate-700 text-xs uppercase">{s.title}</p>
                    <div className="h-16 border-b border-dashed border-slate-400 mx-2"></div>
                    <div>
                      <p className="text-xs text-slate-500">Ký & ghi rõ họ tên</p>
                      <p className="font-medium text-slate-700 mt-1 text-xs">{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-center text-xs text-slate-400 pt-4 border-t">
                Biên bản được lập thành 02 bản, mỗi bên giữ 01 bản. — Ngày in: {format(new Date(), "dd/MM/yyyy HH:mm")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
