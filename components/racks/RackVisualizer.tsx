"use client";

import React from "react";
import { Server } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AssetOnRack {
    id: string;
    serialNumber: string;
    rackUnit: number | null;
    uHeight: number; // Mặc định là 1 nếu null
    product?: { name?: string | null } | null;
    status?: string;
}

interface RackVisualizerProps {
    totalUnits?: number;
    assets: AssetOnRack[];
}

export function RackVisualizer({ totalUnits = 42, assets }: RackVisualizerProps) {

    // Tạo mảng số U từ trên xuống dưới (42 -> 1)
    const units = Array.from({ length: totalUnits }, (_, i) => totalUnits - i);

    // Hàm kiểm tra xem vị trí U này có bị chiếm bởi một thiết bị to nằm ở dưới không?
    // Ví dụ: Đang vẽ U12, nhưng ở U10 có một con Server 4U (chiếm 10,11,12,13).
    // Thì U12 phải bị ẩn đi (return true) để nhường chỗ cho khối 4U vẽ từ U10 lên.
    const isOccupiedByLowerUnit = (currentU: number) => {
        return assets.some(a =>
            a.rackUnit &&
            a.rackUnit < currentU && // Asset nằm dưới
            (a.rackUnit + a.uHeight - 1) >= currentU // Nhưng chiều cao của nó vươn tới đây
        );
    };

    return (
        <div className="w-full max-w-md mx-auto bg-slate-950 p-3 sm:p-4 md:p-6 rounded-xl border-4 border-slate-800 shadow-2xl">
            <div className="space-y-1 relative">
                {units.map((u) => {
                    // 1. Tìm asset có "chân" đặt tại U này
                    const asset = assets.find((a) => a.rackUnit === u);

                    // 2. Nếu U này đang bị chiếm bởi thằng khác to hơn nằm ở dưới -> Không render gì cả (ẩn đi)
                    if (isOccupiedByLowerUnit(u)) {
                        return null;
                    }

                    // Tính chiều cao của Slot (Mỗi U ~ 40px + gap 4px)
                    // Nếu asset cao 2U -> height = 40*2 + 4 = 84px
                    const slotHeight = asset ? `${asset.uHeight * 40 + (asset.uHeight - 1) * 4}px` : "40px";

                    return (
                        <div key={u} className="flex items-end gap-2 md:gap-3 group relative" style={{ height: slotHeight }}>

                            {/* Cột Số U Trái */}
                            <div className="flex flex-col justify-between h-full w-6 md:w-8 py-2">
                                {/* Nếu là thiết bị nhiều U, hiển thị dải số U (VD: 12-10) */}
                                {asset && asset.uHeight > 1 ? (
                                    <>
                                        <span className="text-[10px] text-slate-600 font-mono text-right">{u + asset.uHeight - 1}</span>
                                        <div className="h-full border-r border-slate-700 border-dashed mx-2 opacity-30"></div>
                                        <span className="text-xs text-slate-400 font-bold font-mono text-right">{u}</span>
                                    </>
                                ) : (
                                    <span className="text-xs font-mono text-slate-500 group-hover:text-white transition-colors text-right">{u}</span>
                                )}
                            </div>

                            {/* Slot Thiết Bị */}
                            <div
                                className={`flex-1 h-full rounded border transition-all duration-200 relative overflow-hidden flex flex-col justify-center
                  ${asset
                                        ? "bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/30 hover:border-blue-400 cursor-pointer shadow-lg z-10"
                                        : "bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700"
                                    }
                `}
                            >
                                {asset ? (
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center justify-between px-2 md:px-4 w-full h-full">
                                                    <div className="flex min-w-0 items-center gap-2 md:gap-3">
                                                        {/* Icon to hơn nếu thiết bị to */}
                                                        <Server className={`${asset.uHeight > 1 ? "w-6 h-6" : "w-4 h-4"} text-blue-400 shrink-0`} />

                                                        <div className="flex min-w-0 flex-col">
                                                            <span className={`truncate font-bold text-blue-100 ${asset.uHeight > 1 ? "text-xs md:text-sm" : "text-[11px] md:text-xs"}`}>
                                                                {asset.product?.name || "Unknown Device"}
                                                            </span>
                                                            {asset.uHeight > 1 && (
                                                                <span className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">
                                                                    {asset.uHeight}U SERVER
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-mono text-blue-300 opacity-60 hidden sm:inline-block">
                                                        {asset.serialNumber}
                                                    </span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                                                <p className="font-bold">{asset.product?.name}</p>
                                                <p className="text-xs">Cao: {asset.uHeight}U</p>
                                                <p className="text-xs">Vị trí: U{asset.rackUnit} - U{asset.rackUnit! + asset.uHeight - 1}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : (
                                    <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[9px] text-slate-700 font-bold tracking-widest">EMPTY U{u}</span>
                                    </div>
                                )}
                            </div>

                            {/* Cột Số U Phải */}
                            <span className="w-6 md:w-8 text-xs font-mono text-slate-500 group-hover:text-white transition-colors py-2">
                                {u}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
