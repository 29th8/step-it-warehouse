import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET(req: Request) {
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Step-IT System";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet("Mau_Import_Thiet_Bi");

        const columnsDef = [
            { header: "Số serial", key: "serialNumber", width: 25 },
            { header: "Mã sản phẩm", key: "productModel", width: 25 },
            { header: "Tên kho", key: "warehouseName", width: 25 },
            { header: "Tên rack", key: "rackName", width: 20 },
            { header: "Vị trí U", key: "rackUnit", width: 12 },
            { header: "Chiều cao U", key: "uHeight", width: 12 },
            { header: "Trạng thái", key: "status", width: 18 },
            { header: "Serial thiết bị cha", key: "parentSerial", width: 25 },
            { header: "Loại slot", key: "installSlotType", width: 16 },
            { header: "Tên slot DIMM/Bay", key: "installSlotName", width: 20 },
            { header: "Ghi chú", key: "notes", width: 40 },
            { header: "Chủ sở hữu", key: "owner", width: 18 },
        ];

        sheet.columns = columnsDef;

        // Header styling
        sheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });
        sheet.getRow(1).height = 25;

        // Add exactly one example row
        sheet.addRow({
            serialNumber: "SN-EXAMPLE-001",
            productModel: "DL380-GEN10",
            warehouseName: "Kho Nội Chính",
            rackName: "Rack A1",
            rackUnit: 12,
            uHeight: 2,
            status: "IN_STOCK",
            parentSerial: "",
            installSlotType: "",
            installSlotName: "",
            notes: "Đây là dữ liệu mẫu, hãy xoá dòng này trước khi import.",
            owner: "STEP",
        });

        sheet.addRow({
            serialNumber: "RAM-EXAMPLE-001",
            productModel: "RAM-32G-ECC",
            warehouseName: "Kho Nội Chính",
            rackName: "",
            rackUnit: "",
            uHeight: "",
            status: "INSTALLED",
            parentSerial: "SN-SERVER-001",
            installSlotType: "DIMM",
            installSlotName: "DIMM 1",
            notes: "Ví dụ RAM đã lắp vào server.",
            owner: "STEP",
        });

        sheet.addRow({
            serialNumber: "DISK-EXAMPLE-001",
            productModel: "SSD-192-ENT",
            warehouseName: "Kho Nội Chính",
            rackName: "",
            rackUnit: "",
            uHeight: "",
            status: "INSTALLED",
            parentSerial: "SN-SERVER-001",
            installSlotType: "BAY",
            installSlotName: "Bay 1",
            notes: "Ví dụ ổ cứng đã lắp vào server.",
            owner: "STEP",
        });

        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer as ArrayBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="import-assets-template.xlsx"`,
            },
        });

    } catch (error) {
        console.error("Download Template Error:", error);
        return NextResponse.json({ error: "Lỗi tải template" }, { status: 500 });
    }
}
