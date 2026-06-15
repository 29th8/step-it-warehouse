import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { Prisma, ProductCategory } from "@prisma/client";
import { checkRackOverlap } from "@/lib/rack-utils"; // Đảm bảo bạn đã tạo file này

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "available_components") {
      const components = await prisma.asset.findMany({
        where: {
          parentId: null,
          status: "IN_STOCK",
          product: {
            category: {
              notIn: [ProductCategory.SERVER, ProductCategory.NETWORK]
            }
          }
        },
        include: {
          product: { select: { name: true } }
        },
        orderBy: { product: { name: 'asc' } }
      });
      return NextResponse.json(components);
    }

    if (type === "available_for_rental") {
      const assets = await prisma.asset.findMany({
        where: {
          status: "IN_STOCK",
          parentId: null,
          deletedAt: null
        },
        include: {
          product: true
        },
        orderBy: {
          product: { name: "asc" }
        }
      });
      return NextResponse.json(assets);
    }

    // =============================================
    // DYNAMIC FILTER BUILDER
    // =============================================
    const category = searchParams.get("category");
    const vendor = searchParams.get("vendor");
    const generation = searchParams.get("generation");
    const capacity = searchParams.get("capacity");
    const storageInterface = searchParams.get("interface");
    const attrType = searchParams.get("attrType");
    const series = searchParams.get("series");
    const q = searchParams.get("search");
    const limit = searchParams.get("take");
    const isComponent = searchParams.get("component");
    const tabFilter = searchParams.get("tabFilter"); // "main" | "component"

    const whereClause: any = { deletedAt: null };

    // Component mode: only loose, in-stock parts (assembly screen)
    if (isComponent === "true") {
      whereClause.parentId = null;
      whereClause.status = "IN_STOCK";
      if (!category) {
        whereClause.product = {
          OR: [
            { category: ProductCategory.MEMORY },
            { category: ProductCategory.STORAGE },
            { category: ProductCategory.CPU },
            { category: ProductCategory.GPU },
            { category: ProductCategory.ACCESSORY },
          ]
        };
      }
    }

    // Tab filter: dùng OR thay vì in để tránh lỗi enum filter trên một số môi trường
    if (tabFilter && !category) {
      if (tabFilter === "main") {
        whereClause.product = {
          OR: [
            { category: ProductCategory.SERVER },
            { category: ProductCategory.NETWORK },
          ]
        };
      } else if (tabFilter === "component") {
        whereClause.product = {
          OR: [
            { category: ProductCategory.MEMORY },
            { category: ProductCategory.STORAGE },
            { category: ProductCategory.CPU },
            { category: ProductCategory.GPU },
            { category: ProductCategory.ACCESSORY },
          ]
        };
      }
    }

    // Warehouse filter
    const warehouseId = searchParams.get("warehouseId");
    if (warehouseId) whereClause.warehouseId = warehouseId;

    // Parent filter (lấy linh kiện con của một server)
    const parentId = searchParams.get("parentId");
    if (parentId) whereClause.parentId = parentId;

    // Full-text search
    if (q) {
      whereClause.OR = [
        { serialNumber: { contains: q, mode: "insensitive" } },
        { product: { name: { contains: q, mode: "insensitive" } } },
        { product: { modelNumber: { contains: q, mode: "insensitive" } } }
      ];
    }

    // Status filter (chỉ apply khi user chọn cụ thể, không filter mặc định)
    const statusFilter = searchParams.get("status");
    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    // Owner filter
    const ownerFilter = searchParams.get("owner");
    if (ownerFilter) {
      whereClause.owner = { contains: ownerFilter, mode: "insensitive" };
    }

    // Product-level filters (category, vendor, JSON attributes)
    if (category || vendor || generation || capacity || storageInterface || attrType || series) {
      if (!whereClause.product) whereClause.product = {};
      if (!whereClause.product.AND) whereClause.product.AND = [];

      if (category) whereClause.product.category = category;
      if (vendor) whereClause.product.vendor = vendor;

      if (generation) whereClause.product.AND.push({ attributes: { path: ["generation"], equals: generation } });
      if (capacity) whereClause.product.AND.push({ attributes: { path: ["capacity"], string_contains: capacity } });
      if (storageInterface) whereClause.product.AND.push({ attributes: { path: ["interface"], equals: storageInterface } });
      if (attrType) whereClause.product.AND.push({ attributes: { path: ["type"], equals: attrType } });
      if (series) whereClause.product.AND.push({ attributes: { path: ["series"], equals: series } });

      if (whereClause.product.AND.length === 0) {
        delete whereClause.product.AND;
      }
    }

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "0"); // 0 = no pagination

    const [assets, total] = await prisma.$transaction([
      prisma.asset.findMany({
        where: whereClause,
        include: {
          product: true, warehouse: true, rack: true,
          parent: { include: { product: true } }
        },
        orderBy: { createdAt: "desc" },
        take: pageSize > 0 ? pageSize : (limit ? parseInt(limit) : undefined),
        skip: pageSize > 0 ? (page - 1) * pageSize : 0,
      }),
      prisma.asset.count({ where: whereClause }),
    ]);

    if (pageSize > 0) {
      return NextResponse.json({ data: assets, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    }
    return NextResponse.json(assets);

  } catch (error) {
    console.error("GET Assets Error:", error);
    return NextResponse.json({ error: "Lỗi tải dữ liệu" }, { status: 500 });
  }
}

// ============================================================================
// 2. POST: TẠO THIẾT BỊ MỚI (ĐÃ HỢP NHẤT LOGIC MULTI-U)
// ============================================================================
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionIdentifier = session?.user?.name || (session?.user as any)?.username;

    if (!sessionIdentifier) {
      return NextResponse.json({ error: "Unauthorized. Vui lòng đăng nhập!" }, { status: 401 });
    }

    const currentUser = await prisma.user.findFirst({
      where: { OR: [{ username: sessionIdentifier }, { name: sessionIdentifier }] }
    });

    if (!currentUser) return NextResponse.json({ error: "Tài khoản không tồn tại." }, { status: 404 });
    const userId = currentUser.id;

    const data = await req.json();

    if (!data.serialNumber || data.serialNumber.trim() === "") {
      return NextResponse.json({ error: "Serial Number không được để trống." }, { status: 400 });
    }

    const cleanSN = data.serialNumber.trim().toUpperCase();

    // 1. KIỂM TRA TRÙNG LẶP SERIAL NUMBER
    const existingAsset = await prisma.asset.findUnique({
      where: { serialNumber: cleanSN }
    });

    if (existingAsset) {
      return NextResponse.json(
        { error: `Serial Number '${cleanSN}' đã tồn tại trong hệ thống.` },
        { status: 409 }
      );
    }

    // ------------------------------------------------------------------------
    // 2. KIỂM TRA TRÙNG LẶP VỊ TRÍ TRÊN RACK (CHỈ CHO DATACENTER)
    // ------------------------------------------------------------------------
    if (data.rackId && data.rackId !== "none" && data.rackUnit) {
      const rack = await prisma.rack.findUnique({
        where: { id: data.rackId },
        include: {
          assets: { select: { id: true, rackUnit: true, uHeight: true } }
        }
      });

      if (!rack) {
        return NextResponse.json({ error: "Tủ Rack không tồn tại." }, { status: 404 });
      }

      // Chỉ validate vị trí U cho Rack DATACENTER
      if (rack.type === "DATACENTER" && rack.totalUnits) {
        const newHeight = parseInt(data.uHeight || 1);
        const newUnit = parseInt(data.rackUnit);

        // Validate vượt quá chiều cao tủ
        if (newUnit + newHeight - 1 > rack.totalUnits) {
          return NextResponse.json({
            error: `Vị trí vượt quá chiều cao tủ rack (${rack.totalUnits}U)`
          }, { status: 400 });
        }

        // Validate trùng lặp vị trí với thiết bị khác
        const isOverlap = checkRackOverlap(
          newUnit,
          newHeight,
          rack.assets
        );

        if (isOverlap) {
          return NextResponse.json({
            error: "Vị trí U này đang bị chiếm bởi thiết bị khác trong tủ."
          }, { status: 409 });
        }
      }
    }
    // ------------------------------------------------------------------------

    // 3. THỰC THI GIAO DỊCH TẠO ASSET
    const newAsset = await prisma.$transaction(async (tx) => {
      const createData: any = {
        serialNumber: cleanSN,
        status: data.status || "IN_STOCK",
        uHeight: parseInt(data.uHeight || 1), // Lưu chiều cao U
      };

      if (data.notes) createData.notes = data.notes;
      if (data.owner !== undefined) createData.owner = data.owner || null;
      if (data.productId) createData.product = { connect: { id: data.productId } };
      if (data.warehouseId) createData.warehouse = { connect: { id: data.warehouseId } };

      if (data.rackId && data.rackId !== "none") {
        createData.rack = { connect: { id: data.rackId } };
        if (data.rackUnit) {
          createData.rackUnit = parseInt(data.rackUnit);
        }
      }

      if (data.parentId) {
        createData.parent = { connect: { id: data.parentId } };
      }

      const asset = await tx.asset.create({
        data: createData,
      });

      await tx.stockMovement.create({
        data: {
          type: "IMPORT",
          note: `Nhập mới thiết bị: ${cleanSN}. Cỡ: ${createData.uHeight}U.`,
          asset: { connect: { id: asset.id } },
          user: { connect: { id: userId } }
        },
      });

      return asset;
    });

    return NextResponse.json(newAsset, { status: 201 });

  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: "Serial Number này đã tồn tại (Lỗi trùng lặp)." },
        { status: 409 }
      );
    }

    console.error("POST Asset Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi tạo thiết bị." }, { status: 500 });
  }
}