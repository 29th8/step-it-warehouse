import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    // 1. BẢO MẬT & LẤY USER ID
    const session = await getServerSession(authOptions);
    const sessionIdentifier = session?.user?.name || (session?.user as any)?.username;
    if (!sessionIdentifier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const currentUser = await prisma.user.findFirst({
      where: { OR: [{ username: sessionIdentifier }, { name: sessionIdentifier }] },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 404 });
    }
    const userId = currentUser.id;

    // 2. LẤY DỮ LIỆU
    const body = await req.json();
    const { type, parentId, componentId, componentIds } = body;

    // ===============================================
    // XỬ LÝ LẮP RÁP HÀNG LOẠT (ATTACH_BULK)
    // ===============================================
    if (type === "ATTACH_BULK") {
      if (!parentId || !Array.isArray(componentIds) || componentIds.length === 0) {
        return NextResponse.json({ error: "Thiếu ID máy mẹ hoặc danh sách linh kiện" }, { status: 400 });
      }

      const parentAsset = await prisma.asset.findUnique({ where: { id: parentId } });
      if (!parentAsset) {
        return NextResponse.json({ error: "Không tìm thấy thiết bị mẹ" }, { status: 404 });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Cập nhật hàng loạt chỉ những linh kiện đang rảnh rỗi (parentId is null)
        const updateResult = await tx.asset.updateMany({
          where: {
            id: { in: componentIds },
            parentId: null,
            status: 'IN_STOCK',
          },
          data: {
            parentId: parentId,
            status: "DEPLOYED",
            warehouseId: parentAsset.warehouseId,
            rackId: parentAsset.rackId,
            rackUnit: parentAsset.rackUnit,
          },
        });

        // Nếu không có linh kiện nào hợp lệ được cập nhật
        if (updateResult.count === 0) {
          throw new Error("Không có linh kiện hợp lệ nào được tìm thấy để lắp ráp. Có thể chúng đã được lắp đặt trước đó.");
        }

        // Ghi log cho TẤT CẢ linh kiện đã được lắp thành công
        const logData = componentIds.map((cId: string) => ({
          type: "ASSEMBLE" as const,
          note: `Lắp ráp vào thiết bị mẹ [SN: ${parentAsset.serialNumber}].`,
          assetId: cId,
          userId: userId,
        }));
        await tx.stockMovement.createMany({ data: logData });
        
        return updateResult;
      });
      
      return NextResponse.json({ data: { message: `Đã lắp ráp thành công ${result.count} linh kiện.` } });
    }

    // ===============================================
    // XỬ LÝ THÁO RỜI HÀNG LOẠT (DETACH_BULK)
    // ===============================================
    else if (type === 'DETACH_BULK') {
      if (!Array.isArray(componentIds) || componentIds.length === 0) {
        return NextResponse.json({ error: "Thiếu danh sách linh kiện cần tháo" }, { status: 400 });
      }

      // Lấy thông tin máy mẹ để ghi log
      const components = await prisma.asset.findMany({
        where: { id: { in: componentIds }, parentId: { not: null } },
        include: { parent: true }
      });
      
      if(components.length === 0) {
        return NextResponse.json({ error: "Không tìm thấy linh kiện hợp lệ để tháo" }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.asset.updateMany({
          where: { id: { in: componentIds }, parentId: { not: null } },
          data: {
            parentId: null,
            status: "IN_STOCK",
            rackId: null,
            rackUnit: null,
          },
        });

        const logData = components.map(comp => ({
          type: "DISASSEMBLE" as const,
          note: `Tháo rời khỏi thiết bị mẹ [SN: ${comp.parent?.serialNumber || 'Không rõ'}].`,
          assetId: comp.id,
          userId: userId,
        }));
        await tx.stockMovement.createMany({ data: logData });

        return updateResult;
      });
      
      return NextResponse.json({ data: { message: `Đã tháo rời thành công ${result.count} linh kiện.` } });
    }

    return NextResponse.json({ error: "Loại thao tác không được hỗ trợ" }, { status: 400 });

  } catch (error: unknown) {
    console.error("Assembly API Error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Lỗi hệ thống không xác định" }, { status: 500 });
  }
}