import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { format } from "date-fns";

function serializeAsset(asset: any): any {
  return {
    ...asset,
    product: asset.product
      ? {
        ...asset.product,
        category: asset.product.productCategory?.code || "",
        categoryName: asset.product.productCategory?.name || asset.product.productCategory?.code || "",
      }
      : asset.product,
  };
}

function serializeRecord(record: any): any {
  return {
    ...record,
    items: Array.isArray(record.items)
      ? record.items.map((item: any) => ({ ...item, asset: serializeAsset(item.asset) }))
      : record.items,
  };
}

// GET: Danh sách biên bản bàn giao
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { recipientName: { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
        { purpose: { contains: search, mode: "insensitive" } },
      ];
    }

    const records = await prisma.handoverRecord.findMany({
      where,
      include: {
        user: { select: { name: true, username: true } },
        items: {
          include: {
            asset: { include: { product: { include: { productCategory: true } }, warehouse: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(records.map(serializeRecord));
  } catch (error) {
    return NextResponse.json({ error: "Lỗi tải dữ liệu" }, { status: 500 });
  }
}

// POST: Tạo biên bản bàn giao mới
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const identifier = session?.user?.name || (session?.user as any)?.username;
    if (!identifier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUser = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { name: identifier }] }
    });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { recipientName, department, purpose, supervisorName, handoverDate, expectedReturn, assetIds, note } = body;

    if (!recipientName || !department || !purpose || !supervisorName || !assetIds?.length) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Validate assets
    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds }, deletedAt: null },
      include: { product: { include: { productCategory: true } } }
    });

    // Cho phép:
    // 1. Asset IN_STOCK (đang trong kho)
    // 2. Asset có parentId mà server cha đang được bàn giao cùng (linh kiện trong server)
    const assetIdSet = new Set(assetIds);
    const notAllowed = assets.filter(a => {
      if (a.status === "IN_STOCK") return false;
      if (a.parentId && assetIdSet.has(a.parentId)) return false; // linh kiện của server trong danh sách
      return true;
    });
    if (notAllowed.length > 0) {
      return NextResponse.json({
        error: `Thiết bị không thể bàn giao (không ở trong kho và không thuộc server được chọn): ${notAllowed.map(a => a.serialNumber).join(", ")}`
      }, { status: 400 });
    }

    // Sinh mã biên bản: BBG-YYYYMMDD-XXXX
    const dateStr = format(new Date(), "yyyyMMdd");
    const count = await prisma.handoverRecord.count({
      where: { code: { startsWith: `BBG-${dateStr}` } }
    });
    const code = `BBG-${dateStr}-${String(count + 1).padStart(4, "0")}`;

    const record = await prisma.$transaction(async (tx) => {
      const handover = await tx.handoverRecord.create({
        data: {
          code,
          recipientName,
          department,
          purpose,
          supervisorName,
          handoverDate: handoverDate ? new Date(handoverDate) : new Date(),
          expectedReturn: expectedReturn ? new Date(expectedReturn) : null,
          note,
          userId: currentUser.id,
          items: {
            create: assetIds.map((id: string) => ({
              assetId: id,
              previousOwner: assets.find(a => a.id === id)?.owner ?? null
            }))
          }
        },
        include: {
          user: { select: { name: true, username: true } },
          items: {
            include: {
              asset: { include: { product: { include: { productCategory: true } }, warehouse: true } }
            }
          }
        }
      });

      // Cập nhật trạng thái assets + ghi log — tất cả → HANDED_OVER
      for (const assetId of assetIds) {
        await tx.asset.update({
          where: { id: assetId },
          data: { status: "HANDED_OVER", owner: `${department} - ${recipientName}` }
        });
        await tx.stockMovement.create({
          data: {
            type: "HANDOVER",
            note: `Bàn giao theo biên bản ${code} cho ${recipientName} (${department}). Mục đích: ${purpose}`,
            assetId,
            userId: currentUser.id
          }
        });
      }

      return handover;
    });

    return NextResponse.json(serializeRecord(record), { status: 201 });
  } catch (error: any) {
    console.error("Handover POST error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống" }, { status: 500 });
  }
}
