import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { format } from "date-fns";

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
            asset: { include: { product: true, warehouse: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(records);
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

    // Validate assets đều IN_STOCK
    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds }, deletedAt: null },
      include: { product: true }
    });

    const notInStock = assets.filter(a => a.status !== "IN_STOCK");
    if (notInStock.length > 0) {
      return NextResponse.json({
        error: `Thiết bị không ở trạng thái Trong kho: ${notInStock.map(a => a.serialNumber).join(", ")}`
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
            create: assetIds.map((id: string) => ({ assetId: id }))
          }
        },
        include: {
          items: { include: { asset: { include: { product: true } } } }
        }
      });

      // Cập nhật trạng thái assets → DEPLOYED + ghi log
      for (const assetId of assetIds) {
        const asset = assets.find(a => a.id === assetId);
        await tx.asset.update({
          where: { id: assetId },
          data: { status: "DEPLOYED", owner: `${department} - ${recipientName}` }
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

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    console.error("Handover POST error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống" }, { status: 500 });
  }
}
