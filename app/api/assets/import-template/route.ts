import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

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

        const [products, warehouses] = await Promise.all([
            prisma.product.findMany({ select: { modelNumber: true }, orderBy: { modelNumber: "asc" } }),
            prisma.warehouse.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
        ]);
        const reference = workbook.addWorksheet("Du_lieu_tham_chieu");
        reference.state = "hidden";
        const statuses = ["IN_STOCK", "INSTALLED", "DEPLOYED", "MAINTENANCE", "FAULTY"];
        reference.getCell("A1").value = "Mã sản phẩm";
        reference.getCell("B1").value = "Tên kho";
        reference.getCell("C1").value = "Trạng thái";
        products.forEach((product, index) => { reference.getCell(`A${index + 2}`).value = product.modelNumber; });
        warehouses.forEach((warehouse, index) => { reference.getCell(`B${index + 2}`).value = warehouse.name; });
        statuses.forEach((status, index) => { reference.getCell(`C${index + 2}`).value = status; });

        const setDropdown = (column: string, referenceColumn: string, count: number) => {
            if (!count) return;
            const rangeName = `DanhSach${referenceColumn}`;
            workbook.definedNames.add(`'Du_lieu_tham_chieu'!$${referenceColumn}$2:$${referenceColumn}$${count + 1}`, rangeName);
            for (let row = 2; row <= 1001; row++) {
                sheet.getCell(`${column}${row}`).dataValidation = {
                    type: "list",
                    allowBlank: true,
                    formulae: [rangeName],
                    showErrorMessage: true,
                    errorTitle: "Giá trị không hợp lệ",
                    error: "Vui lòng chọn một giá trị trong danh sách.",
                };
            }
        };
        setDropdown("B", "A", products.length);
        setDropdown("C", "B", warehouses.length);
        setDropdown("G", "C", statuses.length);

        const guide = workbook.addWorksheet("Huong_dan");
        guide.columns = [{ header: "Hướng dẫn nhập thiết bị", key: "guide", width: 100 }];
        [
            "Xóa các dòng ví dụ trước khi nhập dữ liệu.",
            "Số serial, mã sản phẩm và tên kho là bắt buộc. Chọn mã sản phẩm và kho từ danh sách.",
            "Trạng thái để trống sẽ mặc định là IN_STOCK. Danh sách trạng thái phản ánh các giá trị API import hiện hỗ trợ.",
            "Serial thiết bị cha phải tồn tại trong hệ thống trước khi import linh kiện.",
            "RAM và ổ cứng gắn với thiết bị cha hiện cần khai báo loại slot và tên DIMM/Bay.",
            "Chiều cao U được lấy từ sản phẩm; giá trị trong cột chiều cao U không được import sử dụng.",
            "Danh sách chọn được tạo tại thời điểm tải mẫu; hãy tải lại mẫu khi có sản phẩm hoặc kho mới.",
        ].forEach((line) => guide.addRow({ guide: line }));

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
