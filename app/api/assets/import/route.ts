import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
    try {
        // 1. Auth check
        const session = await getServerSession(authOptions);
        const sessionIdentifier = session?.user?.name || (session?.user as any)?.username;
        if (!sessionIdentifier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const currentUser = await prisma.user.findFirst({
            where: { OR: [{ username: sessionIdentifier }, { name: sessionIdentifier }] }
        });
        if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
        const userId = currentUser.id;

        // 2. Parse FormData
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const isPreview = formData.get("preview") === "true"; // flag from frontend

        if (!file) {
            return NextResponse.json({ error: "Thiếu file Excel" }, { status: 400 });
        }

        // 3. Load Excel Workbook
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        const worksheet = workbook.worksheets[0]; // Take first sheet

        if (!worksheet) {
            return NextResponse.json({ error: "File Excel rỗng" }, { status: 400 });
        }

        // 4. Extract data rows (assuming row 1 is header)
        const rawData: any[] = [];
        const headers: string[] = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
                // Lấy header name mapping
                row.eachCell((cell, colNumber) => {
                    headers[colNumber] = cell.value ? cell.value.toString().trim() : "";
                });
            } else {
                const rowData: any = { _rowNum: rowNumber };
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const headerName = headers[colNumber];
                    if (headerName) {
                        // Extract text value precisely
                        let cellValue = cell.value;
                        if (cellValue && typeof cellValue === 'object' && 'richText' in cellValue) {
                            cellValue = (cellValue as any).richText.map((t: any) => t.text).join("");
                        } else if (cellValue && typeof cellValue === 'object' && 'hyperlink' in cellValue) {
                            cellValue = (cellValue as any).text;
                        }
                        rowData[headerName] = cellValue ? cellValue.toString().trim() : null;
                    }
                });
                rawData.push(rowData);
            }
        });

        // 5. Build Dictionaries for Validation (Products, Warehouses, Racks)
        const [products, warehouses, racks] = await Promise.all([
            prisma.product.findMany({ select: { id: true, modelNumber: true } }),
            prisma.warehouse.findMany({ select: { id: true, name: true } }),
            prisma.rack.findMany({ select: { id: true, name: true, warehouseId: true, totalUnits: true } })
        ]);

        // Lookup Maps for O(1) checking
        const productMap = new Map(products.map(p => [p.modelNumber.toLowerCase(), p.id]));
        const warehouseMap = new Map(warehouses.map(w => [w.name.toLowerCase(), w.id]));
        const rackMap = new Map(racks.map(r => [`${r.name.toLowerCase()}-${r.warehouseId}`, r]));
        const validStatuses = ["IN_STOCK", "DEPLOYED", "MAINTENANCE", "FAULTY"];

        // 6. Preview & Validation Loop
        const validRows: any[] = [];
        const invalidRows: any[] = [];
        const serialsInFile = new Set<string>(); // catch duplicates inside the file

        for (const row of rawData) {
            const serialNumber = row["SerialNumber"];
            const model = row["ProductModel"];
            const whName = row["WarehouseName"];
            const rkName = row["RackName"];
            const rackUnitStr = row["RackUnit"];
            const status = row["Status"]?.toUpperCase() || "IN_STOCK";
            const parentSerial = row["ParentSerial"];
            const owner = row["Owner"] || null;

            const errors: string[] = [];

            // A. Serial Number rules
            if (!serialNumber) {
                errors.push("Missing SerialNumber");
            } else {
                if (serialsInFile.has(serialNumber)) {
                    errors.push(`Duplicate SerialNumber in file: ${serialNumber}`);
                }
                serialsInFile.add(serialNumber);
            }

            // Check DB existence if Serial provided
            let existingAsset = null;
            if (serialNumber) {
                existingAsset = await prisma.asset.findUnique({ where: { serialNumber } });
                if (existingAsset) errors.push(`SerialNumber already exists in system`);
            }

            // B. Product Model mapping
            let productId = null;
            if (!model) {
                errors.push("Missing ProductModel");
            } else {
                productId = productMap.get(model.toLowerCase());
                if (!productId) errors.push(`ProductModel not found: ${model}`);
            }

            // C. Warehouse mapping
            let warehouseId = null;
            if (!whName) {
                errors.push("Missing WarehouseName");
            } else {
                warehouseId = warehouseMap.get(whName.toLowerCase());
                if (!warehouseId) errors.push(`WarehouseName not found: ${whName}`);
            }

            // D. Rack mapping (Optional)
            let rackId = null;
            let rackUnit = rackUnitStr ? parseInt(rackUnitStr) : null;

            if (rkName) {
                if (!warehouseId) {
                    errors.push(`Cannot assign Rack without valid Warehouse`);
                } else {
                    const mappedRack = rackMap.get(`${rkName.toLowerCase()}-${warehouseId}`);
                    if (!mappedRack) {
                        errors.push(`RackName '${rkName}' not found in Warehouse '${whName}'`);
                    } else {
                        rackId = mappedRack.id;
                        // Check U limits (only for DATACENTER racks with totalUnits)
                        if (rackUnit && mappedRack.totalUnits && (rackUnit < 1 || rackUnit > mappedRack.totalUnits)) {
                            errors.push(`RackUnit ${rackUnit} exceeds Rack limits (1-${mappedRack.totalUnits})`);
                        }
                    }
                }
            }

            // E. Status Validation
            if (!validStatuses.includes(status)) {
                errors.push(`Invalid Status: ${status}. Must be one of IN_STOCK, DEPLOYED, MAINTENANCE, FAULTY`);
            }

            // F. Parent asset validation (Optional)
            let parentId = null;
            if (parentSerial) {
                if (parentSerial === serialNumber) {
                    errors.push(`ParentSerial cannot be self referencing`);
                } else {
                    const parentAsset = await prisma.asset.findUnique({ where: { serialNumber: parentSerial } });
                    if (!parentAsset) {
                        errors.push(`ParentSerial not found in system: ${parentSerial}`);
                    } else {
                        parentId = parentAsset.id;
                    }
                }
            }

            // Outcome
            if (errors.length > 0) {
                invalidRows.push({
                    row: row["_rowNum"],
                    serialNumber: serialNumber || "UNKNOWN",
                    error: errors.join(" | ")
                });
            } else {
                validRows.push({
                    row: row["_rowNum"],
                    serialNumber,
                    productId,
                    warehouseId,
                    rackId,
                    rackUnit,
                    status,
                    parentId,
                    owner,
                    notes: row["Notes"] || ""
                });
            }
        }

        // 7. Render Preview Response OR Execute Import
        if (isPreview) {
            return NextResponse.json({
                totalProcessed: rawData.length,
                validCount: validRows.length,
                invalidCount: invalidRows.length,
                validRows,    // Array of parsed database-ready objects
                invalidRows,  // Array of formatting errors
            });
        }

        // 8. EXECUTE IMPORT TIER (Chunking / Batch Insert)
        if (validRows.length === 0) {
            return NextResponse.json({ error: "Không có dòng dữ liệu hợp lệ nào để Import" }, { status: 400 });
        }

        // Process in chunks to prevent memory/transaction timeouts
        const CHUNK_SIZE = 500;
        let successCount = 0;
        const failedImportRows: any[] = [...invalidRows]; // keep track of previously failed

        for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
            const chunk = validRows.slice(i, i + CHUNK_SIZE);

            const results = await Promise.allSettled(
                chunk.map(async (vh) => {
                    // We use Promise.allSettled inside chunk to isolated failure per asset if unforeseen DB constraints fail
                    const createData: any = {
                        serialNumber: vh.serialNumber,
                        status: vh.status as any,
                        notes: vh.notes,
                        owner: vh.owner || null,
                        product: { connect: { id: vh.productId } },
                        warehouse: { connect: { id: vh.warehouseId } },
                    };

                    if (vh.rackId) {
                        createData.rack = { connect: { id: vh.rackId } };
                        if (vh.rackUnit) createData.rackUnit = vh.rackUnit;
                    }
                    if (vh.parentId) {
                        createData.parent = { connect: { id: vh.parentId } };
                    }

                    return prisma.$transaction(async (tx) => {
                        const newA = await tx.asset.create({ data: createData });

                        await tx.stockMovement.create({
                            data: {
                                type: "IMPORT",
                                note: "Import hàng loạt từ Excel",
                                asset: { connect: { id: newA.id } },
                                user: { connect: { id: userId } }
                            }
                        });
                        return newA;
                    });
                })
            );

            // Analyze chunk results
            results.forEach((res, idx) => {
                if (res.status === "fulfilled") {
                    successCount++;
                } else {
                    failedImportRows.push({
                        row: chunk[idx].row,
                        serialNumber: chunk[idx].serialNumber,
                        error: `Lỗi import DB: ${res.reason.message || res.reason}`
                    });
                }
            });
        }

        return NextResponse.json({
            successCount,
            failedRows: failedImportRows
        });

    } catch (error) {
        console.error("Import Assets Error:", error);
        return NextResponse.json({ error: "Lỗi xử lý file Import" }, { status: 500 });
    }
}
