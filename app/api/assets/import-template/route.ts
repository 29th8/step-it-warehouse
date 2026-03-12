import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET(req: Request) {
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Step-IT System";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet("Template_Import_Assets");

        const columnsDef = [
            { header: "SerialNumber", key: "SerialNumber", width: 25 },
            { header: "ProductModel", key: "ProductModel", width: 25 },
            { header: "WarehouseName", key: "WarehouseName", width: 25 },
            { header: "RackName", key: "RackName", width: 20 },
            { header: "RackUnit", key: "RackUnit", width: 12 },
            { header: "UHeight", key: "UHeight", width: 12 },
            { header: "Status", key: "Status", width: 15 },
            { header: "ParentSerial", key: "ParentSerial", width: 25 },
            { header: "Notes", key: "Notes", width: 40 },
            { header: "Owner", key: "Owner", width: 15 },
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
            SerialNumber: "SN-EXAMPLE-001",
            ProductModel: "DL380-GEN10",
            WarehouseName: "Kho Nội Chính",
            RackName: "Rack A1",
            RackUnit: 12,
            UHeight: 2,
            Status: "IN_STOCK",
            ParentSerial: "",
            Notes: "Đây là dữ liệu mẫu, hãy xoá dòng này trước khi import.",
            Owner: "STEP",
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
