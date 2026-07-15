import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

function formatSlotType(slotType?: string | null) {
    if (slotType === "DRIVE_BAY") return "BAY";
    if (slotType === "DIMM") return "DIMM";
    return "";
}

export async function GET(req: Request) {
    try {
        // 1. Fetch data
        const assets = await prisma.asset.findMany({
            where: {
                deletedAt: null,
            },
            include: {
                product: { include: { productCategory: true } },
                warehouse: true,
                rack: true,
                parent: { select: { serialNumber: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        // 2. Initialize Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Step-IT System";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet("Danh_Sach_Kho");

        const columnsDef = [
            { header: "Số serial", key: "serialNumber", width: 25 },
            { header: "Mã sản phẩm", key: "productModel", width: 25 },
            { header: "Tên sản phẩm", key: "productName", width: 40 },
            { header: "Danh mục", key: "productCategory", width: 22 },
            { header: "Tên kho", key: "warehouse", width: 25 },
            { header: "Tên rack", key: "rack", width: 20 },
            { header: "Vị trí U", key: "rackUnit", width: 12 },
            { header: "Chiều cao U", key: "uHeight", width: 12 },
            { header: "Trạng thái", key: "status", width: 18 },
            { header: "Serial thiết bị cha", key: "parentSerial", width: 25 },
            { header: "Loại slot", key: "installSlotType", width: 16 },
            { header: "Tên slot DIMM/Bay", key: "installSlotName", width: 20 },
            { header: "Ghi chú", key: "notes", width: 40 },
            { header: "Chủ sở hữu", key: "owner", width: 18 },
            { header: "Ngày nhập", key: "createdAt", width: 20 },
        ];

        sheet.columns = columnsDef;

        // Header styling
        sheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });
        sheet.getRow(1).height = 25;

        // 3. Populate Sheet
        assets.forEach((asset) => {
            sheet.addRow({
                serialNumber: asset.serialNumber,
                productModel: asset.product?.modelNumber || "N/A",
                productName: asset.product?.name || "N/A",
                productCategory: asset.product?.productCategory?.name || asset.product?.productCategory?.code || "N/A",
                warehouse: asset.warehouse?.name || "N/A",
                rack: asset.rack?.name || "N/A",
                rackUnit: asset.rackUnit || "",
                uHeight: asset.uHeight || "",
                status: asset.status,
                parentSerial: asset.parent?.serialNumber || "",
                installSlotType: formatSlotType(asset.installSlotType),
                installSlotName: asset.installSlotName || "",
                notes: asset.notes || "",
                owner: asset.owner || "",
                createdAt: new Date(asset.createdAt).toLocaleDateString("vi-VN"),
            });
        });

        // Thêm auto-filter
        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: columnsDef.length },
        };

        // 4. Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // 5. Build response headers
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="inventory-report-${Date.now()}.xlsx"`,
            },
        });

    } catch (error) {
        console.error("Export Assets Error:", error);
        return NextResponse.json({ error: "Lỗi tải dữ liệu báo cáo kho" }, { status: 500 });
    }
}
