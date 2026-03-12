import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET(req: Request) {
    try {
        // 1. Fetch data
        const assets = await prisma.asset.findMany({
            where: {
                status: { not: "DISPOSED" }, // Exclude disposed assets
            },
            include: {
                product: true,
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
            { header: "Serial Number", key: "serialNumber", width: 25 },
            { header: "Mã Sản Phẩm (Model)", key: "productModel", width: 30 },
            { header: "Tên Thiết Bị", key: "productName", width: 40 },
            { header: "Phân Loại", key: "productCategory", width: 20 },
            { header: "Trạng Thái", key: "status", width: 15 },
            { header: "Kho Hàng", key: "warehouse", width: 25 },
            { header: "Tủ Rack", key: "rack", width: 20 },
            { header: "Vị Trí U", key: "rackUnit", width: 10 },
            { header: "Tên Server Cha", key: "parentSerial", width: 25 },
            { header: "Ngày Nhập", key: "createdAt", width: 20 },
            { header: "Ghi chú", key: "notes", width: 40 },
            { header: "Chủ sở hữu (Owner)", key: "owner", width: 25 },
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
                productCategory: asset.product?.category || "N/A",
                status: asset.status,
                warehouse: asset.warehouse?.name || "N/A",
                rack: asset.rack?.name || "N/A",
                rackUnit: asset.rackUnit ? `U${asset.rackUnit}` : "N/A",
                parentSerial: asset.parent?.serialNumber || "",
                createdAt: new Date(asset.createdAt).toLocaleDateString("vi-VN"),
                notes: asset.notes || "",
                owner: asset.owner || "",
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
