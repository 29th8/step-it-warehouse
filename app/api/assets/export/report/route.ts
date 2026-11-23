import { AssetStatus, Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EXPORT_COLUMNS = {
  serialNumber: { header: "Số serial", width: 25 }, productModel: { header: "Mã sản phẩm", width: 25 }, productName: { header: "Tên sản phẩm", width: 40 }, productCategory: { header: "Danh mục", width: 22 }, status: { header: "Trạng thái", width: 18 }, warehouse: { header: "Tên kho", width: 25 }, rack: { header: "Tên rack", width: 20 }, rackUnit: { header: "Vị trí U", width: 12 }, uHeight: { header: "Chiều cao U", width: 12 }, parentSerial: { header: "Serial thiết bị cha", width: 25 }, installSlotType: { header: "Loại slot", width: 16 }, installSlotName: { header: "Tên slot DIMM/BAY", width: 20 }, owner: { header: "Chủ sở hữu", width: 18 }, notes: { header: "Ghi chú", width: 40 }, createdAt: { header: "Ngày nhập", width: 20 },
} as const;

type ExportColumnKey = keyof typeof EXPORT_COLUMNS;
const defaultColumns = Object.keys(EXPORT_COLUMNS) as ExportColumnKey[];
const validStatuses = new Set(Object.values(AssetStatus));

function formatSlotType(slotType?: string | null) {
  return slotType === "DRIVE_BAY" ? "BAY" : slotType === "DIMM" ? "DIMM" : "";
}

function readColumns(value: unknown): ExportColumnKey[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : defaultColumns;
  const columns = raw.filter((column): column is ExportColumnKey => typeof column === "string" && column in EXPORT_COLUMNS);
  return columns.length > 0 ? columns : defaultColumns;
}

function exactAttributeFilter(key: string, value: string): Prisma.ProductWhereInput {
  const trimmed = value.trim();
  const numberValue = Number(trimmed);
  return trimmed !== "" && Number.isFinite(numberValue)
    ? { OR: [{ attributes: { path: [key], equals: trimmed } }, { attributes: { path: [key], equals: numberValue } }] }
    : { attributes: { path: [key], equals: trimmed } };
}

function buildFilteredWhere(params: URLSearchParams): Prisma.AssetWhereInput {
  const where: Prisma.AssetWhereInput = { deletedAt: null };
  const category = params.get("category");
  const search = params.get("search");
  const warehouseId = params.get("warehouseId");
  const owner = params.get("owner");
  const status = params.get("status");
  const categories = (params.get("categories") || "").split(",").map((value) => value.trim()).filter(Boolean);
  const statuses = (params.get("statuses") || "").split(",").filter((value): value is AssetStatus => validStatuses.has(value as AssetStatus));
  const exactFilters = Array.from(params.entries()).filter(([key, value]) => key.startsWith("attr_") && value && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key.slice(5))).map(([key, value]) => ({ key: key.slice(5), value }));
  const containsFilters = Array.from(params.entries()).filter(([key, value]) => key.startsWith("attrLike_") && value && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key.slice(9))).map(([key, value]) => ({ key: key.slice(9), value }));

  if (warehouseId) where.warehouseId = warehouseId;
  if (owner) where.owner = { contains: owner, mode: "insensitive" };
  if (search) where.OR = [{ serialNumber: { contains: search, mode: "insensitive" } }, { product: { name: { contains: search, mode: "insensitive" } } }, { product: { modelNumber: { contains: search, mode: "insensitive" } } }];

  if (statuses.length > 0) {
    where.status = { in: statuses };
  } else if (status && status !== "ALL") {
    if (status === "WAREHOUSE_STOCK" || status === "IN_STOCK") {
      where.AND = [{ OR: [{ status: "IN_STOCK", parentId: null }, { status: "IN_STOCK", parent: { status: "IN_STOCK" } }, { status: "INSTALLED", parent: { status: "IN_STOCK" } }] }];
    } else if (status === "AVAILABLE_STOCK") {
      where.status = "IN_STOCK";
      where.parentId = null;
    } else if (status === "NEEDS_ATTENTION") {
      where.status = { in: ["MAINTENANCE", "FAULTY"] };
    } else if (validStatuses.has(status as AssetStatus)) where.status = status as AssetStatus;
  }

  if (category || categories.length > 0 || exactFilters.length > 0 || containsFilters.length > 0) {
    const product: Prisma.ProductWhereInput = {};
    const conditions: Prisma.ProductWhereInput[] = [];
    const categoryValues = category ? [category] : categories;
    if (categoryValues.length > 0) product.productCategory = { OR: categoryValues.flatMap((value) => [{ id: value }, { code: value.toUpperCase() }]) };
    exactFilters.forEach((filter) => conditions.push(exactAttributeFilter(filter.key, filter.value)));
    containsFilters.forEach((filter) => conditions.push({ attributes: { path: [filter.key], string_contains: filter.value } }));
    if (conditions.length > 0) product.AND = conditions;
    where.product = product;
  }
  return where;
}

async function isAuthorized() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return false;
  return Boolean(await prisma.user.findFirst({ where: { id, isActive: true }, select: { id: true } }));
}

function getUniqueSheetName(categoryName: string, usedNames: Set<string>) {
  const baseName = (categoryName || "Chưa phân loại").replace(/[\\/:*?\[\]]/g, " ").trim().slice(0, 31) || "Chưa phân loại";
  let name = baseName;
  let suffix = 2;
  while (usedNames.has(name.toLocaleLowerCase())) {
    const ending = ` (${suffix++})`;
    name = `${baseName.slice(0, 31 - ending.length)}${ending}`;
  }
  usedNames.add(name.toLocaleLowerCase());
  return name;
}

async function createWorkbook(where: Prisma.AssetWhereInput, columns: ExportColumnKey[], requestedCategoryIds: string[] = []) {
  const assets = await prisma.asset.findMany({ where, include: { product: { include: { productCategory: true } }, warehouse: true, rack: true, parent: { select: { serialNumber: true } } }, orderBy: { createdAt: "desc" } });
  if (assets.length === 0) return null;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Step-IT System";
  workbook.created = new Date();
  const requestedCategories = requestedCategoryIds.length > 0
    ? await prisma.productCategory.findMany({ where: { id: { in: Array.from(new Set(requestedCategoryIds)) } }, select: { id: true, name: true } })
    : [];
  const assetsByCategory = new Map<string, { name: string; assets: typeof assets }>();
  requestedCategories.forEach((category) => assetsByCategory.set(category.id, { name: category.name, assets: [] }));
  assets.forEach((asset) => {
    const categoryId = asset.product?.productCategory?.id || "uncategorized";
    const categoryName = asset.product?.productCategory?.name || asset.product?.productCategory?.code || "Chưa phân loại";
    const group = assetsByCategory.get(categoryId) || { name: categoryName, assets: [] };
    group.assets.push(asset);
    assetsByCategory.set(categoryId, group);
  });

  const usedSheetNames = new Set<string>();
  assetsByCategory.forEach((group) => {
    const sheet = workbook.addWorksheet(getUniqueSheetName(group.name, usedSheetNames));
    sheet.columns = columns.map((key) => ({ header: EXPORT_COLUMNS[key].header, key, width: EXPORT_COLUMNS[key].width }));
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    sheet.getRow(1).height = 25;

    group.assets.forEach((asset) => {
      const values: Record<ExportColumnKey, string | number> = {
        serialNumber: asset.serialNumber, productModel: asset.product?.modelNumber || "N/A", productName: asset.product?.name || "N/A", productCategory: asset.product?.productCategory?.name || asset.product?.productCategory?.code || "N/A", status: asset.status, warehouse: asset.warehouse?.name || "N/A", rack: asset.rack?.name || "N/A", rackUnit: asset.rackUnit || "", uHeight: asset.uHeight || "", parentSerial: asset.parent?.serialNumber || "", installSlotType: formatSlotType(asset.installSlotType), installSlotName: asset.installSlotName || "", owner: asset.owner || "", notes: asset.notes || "", createdAt: new Date(asset.createdAt).toLocaleDateString("vi-VN"),
      };
      sheet.addRow(Object.fromEntries(columns.map((key) => [key, values[key]])));
    });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  });
  return workbook.xlsx.writeBuffer();
}

function response(buffer: ExcelJS.Buffer) {
  return new NextResponse(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="inventory-report-${Date.now()}.xlsx"` } });
}

export async function GET(request: Request) {
  try {
    if (!(await isAuthorized())) return NextResponse.json({ error: "Bạn cần đăng nhập để xuất báo cáo." }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const where = searchParams.get("scope") === "all" ? { deletedAt: null } : buildFilteredWhere(searchParams);
    if (searchParams.get("countOnly") === "true") {
      return NextResponse.json({ total: await prisma.asset.count({ where }) });
    }
    const requestedCategoryIds = searchParams.get("scope") === "custom"
      ? (searchParams.get("categories") || "").split(",").map((value) => value.trim()).filter(Boolean)
      : [];
    const buffer = await createWorkbook(where, readColumns(searchParams.get("columns")), requestedCategoryIds);
    if (!buffer) return NextResponse.json({ error: "Không có thiết bị phù hợp để xuất." }, { status: 404 });
    return response(buffer);
  } catch (error) {
    console.error("Export Assets Error:", error);
    return NextResponse.json({ error: "Lỗi tạo báo cáo kho." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAuthorized())) return NextResponse.json({ error: "Bạn cần đăng nhập để xuất báo cáo." }, { status: 401 });
    const body = await request.json().catch(() => null);
    const assetIds = Array.isArray(body?.assetIds) ? body.assetIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0) : [];
    if (assetIds.length === 0) return NextResponse.json({ error: "Hãy chọn ít nhất một thiết bị." }, { status: 400 });
    if (assetIds.length > 5000) return NextResponse.json({ error: "Chỉ có thể xuất tối đa 5.000 thiết bị đã chọn mỗi lần." }, { status: 400 });
    const buffer = await createWorkbook({ deletedAt: null, id: { in: Array.from(new Set(assetIds)) } }, readColumns(body?.columns));
    if (!buffer) return NextResponse.json({ error: "Các thiết bị đã chọn không còn tồn tại." }, { status: 404 });
    return response(buffer);
  } catch (error) {
    console.error("Export Selected Assets Error:", error);
    return NextResponse.json({ error: "Lỗi tạo báo cáo kho." }, { status: 500 });
  }
}
