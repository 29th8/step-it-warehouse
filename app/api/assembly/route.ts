import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { componentSlotType, getSlotNames, isServerProduct } from "@/lib/server-slots";

function assertParentInStock(parentAsset: { status?: string | null; serialNumber?: string | null }) {
  if (parentAsset.status !== "IN_STOCK") {
    throw new Error(`Chỉ được lắp ráp khi server đang ở trạng thái Trong kho. Vui lòng chuyển server ${parentAsset.serialNumber || ""} về Trong kho trước.`);
  }
}

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
    const { type, parentId, componentIds } = body;

    // ===============================================
    // XỬ LÝ LẮP RÁP HÀNG LOẠT (ATTACH_BULK)
    // ===============================================
    if (type === "ATTACH_BULK") {
      if (!parentId || !Array.isArray(componentIds) || componentIds.length === 0) {
        return NextResponse.json({ error: "Thiếu ID máy mẹ hoặc danh sách linh kiện" }, { status: 400 });
      }

      const parentAsset = await prisma.asset.findUnique({
        where: { id: parentId },
        include: { product: { include: { productCategory: true } } },
      });
      if (!parentAsset) {
        return NextResponse.json({ error: "Không tìm thấy thiết bị mẹ" }, { status: 404 });
      }
      assertParentInStock(parentAsset);

      const result = await prisma.$transaction(async (tx) => {
        const components = await tx.asset.findMany({
          where: {
            id: { in: componentIds },
            parentId: null,
            status: 'IN_STOCK',
          },
          include: { product: { include: { productCategory: true } } },
        });

        if (components.length === 0) {
          throw new Error("Không có linh kiện hợp lệ nào được tìm thấy để lắp ráp. Có thể chúng đã được lắp đặt trước đó.");
        }

        const slotAssignments = Array.isArray(body.slotAssignments) ? body.slotAssignments : [];
        const slotByComponentId = new Map<string, { slotType?: string; slotName?: string }>(
          slotAssignments.map((item: any) => [item.componentId, item])
        );
        const occupiedSlots = await tx.asset.findMany({
          where: {
            parentId,
            installSlotType: { not: null },
            installSlotName: { not: null },
          },
          select: { id: true, installSlotType: true, installSlotName: true },
        });
        const usedSlotKeys = new Set(occupiedSlots.map((item) => `${item.installSlotType}:${item.installSlotName}`));

        let count = 0;
        for (const component of components) {
          const requiredSlotType = componentSlotType(component);
          const assignment = slotByComponentId.get(component.id);
          let installSlotType: string | null = null;
          let installSlotName: string | null = null;

          if (requiredSlotType) {
            if (!isServerProduct(parentAsset.product)) {
              throw new Error("RAM và ổ cứng chỉ được lắp vào Server.");
            }

            if (assignment?.slotType !== requiredSlotType || !assignment?.slotName) {
              throw new Error(`${component.serialNumber} bắt buộc chọn ${requiredSlotType === "DIMM" ? "DIMM slot" : "Bay ổ cứng"} khi lắp mới/lắp lại.`);
            }
            const validSlots = getSlotNames(parentAsset.product, requiredSlotType);
            if (validSlots.length === 0) {
              throw new Error("Server này chưa khai báo số DIMM/Bay trong thông tin sản phẩm.");
            }
            if (!validSlots.includes(assignment.slotName)) {
              throw new Error(`Slot ${assignment.slotName} không tồn tại trên server này.`);
            }

            const slotKey = `${assignment.slotType}:${assignment.slotName}`;
            if (usedSlotKeys.has(slotKey)) {
              throw new Error(`Slot ${assignment.slotName} đã có linh kiện khác.`);
            }
            usedSlotKeys.add(slotKey);
            installSlotType = assignment.slotType;
            installSlotName = assignment.slotName;
          }

          await tx.asset.update({
            where: { id: component.id },
            data: {
              parentId,
              status: "INSTALLED",
              warehouseId: parentAsset.warehouseId,
              rackId: parentAsset.rackId,
              rackUnit: null,
              installSlotType,
              installSlotName,
            },
          });

          await tx.stockMovement.create({
            data: {
              type: "ASSEMBLE",
              note: `Lắp ráp vào thiết bị mẹ [SN: ${parentAsset.serialNumber}]${installSlotName ? ` tại ${installSlotName}` : ""}.`,
              assetId: component.id,
              userId,
            },
          });
          count++;
        }

        return { count };
      });
      
      return NextResponse.json({ data: { message: `Đã lắp ráp thành công ${result.count} linh kiện.` } });
    }

    else if (type === "UPDATE_SLOTS") {
      if (!parentId || !Array.isArray(body.slotAssignments) || body.slotAssignments.length === 0) {
        return NextResponse.json({ error: "Thiếu ID máy mẹ hoặc danh sách slot" }, { status: 400 });
      }

      const parentAsset = await prisma.asset.findUnique({
        where: { id: parentId },
        include: { product: { include: { productCategory: true } } },
      });
      if (!parentAsset) {
        return NextResponse.json({ error: "Không tìm thấy thiết bị mẹ" }, { status: 404 });
      }
      if (!isServerProduct(parentAsset.product)) {
        return NextResponse.json({ error: "Chỉ Server mới có DIMM/Bay." }, { status: 400 });
      }
      assertParentInStock(parentAsset);

      const result = await prisma.$transaction(async (tx) => {
        const ids = body.slotAssignments.map((item: any) => item.componentId);
        const components = await tx.asset.findMany({
          where: { id: { in: ids }, parentId },
          include: { product: { include: { productCategory: true } } },
        });
        const componentMap = new Map(components.map((item) => [item.id, item]));

        const occupiedSlots = await tx.asset.findMany({
          where: {
            parentId,
            id: { notIn: ids },
            installSlotType: { not: null },
            installSlotName: { not: null },
          },
          select: { installSlotType: true, installSlotName: true },
        });
        const usedSlotKeys = new Set(occupiedSlots.map((item) => `${item.installSlotType}:${item.installSlotName}`));

        let count = 0;
        for (const assignment of body.slotAssignments as Array<{ componentId: string; slotType?: string; slotName?: string }>) {
          const component = componentMap.get(assignment.componentId);
          if (!component) throw new Error("Không tìm thấy linh kiện trong server này.");

          const requiredSlotType = componentSlotType(component);
          if (!requiredSlotType) continue;
          if (assignment.slotType !== requiredSlotType || !assignment.slotName) {
            throw new Error(`${component.serialNumber} bắt buộc chọn ${requiredSlotType === "DIMM" ? "DIMM slot" : "Bay ổ cứng"}.`);
          }

          const validSlots = getSlotNames(parentAsset.product, requiredSlotType);
          if (validSlots.length === 0) {
            throw new Error("Server này chưa khai báo số DIMM/Bay trong thông tin sản phẩm.");
          }
          if (!validSlots.includes(assignment.slotName)) {
            throw new Error(`Slot ${assignment.slotName} không tồn tại trên server này.`);
          }

          const slotKey = `${assignment.slotType}:${assignment.slotName}`;
          if (usedSlotKeys.has(slotKey)) {
            throw new Error(`Slot ${assignment.slotName} đã có linh kiện khác.`);
          }
          usedSlotKeys.add(slotKey);

          await tx.asset.update({
            where: { id: component.id },
            data: {
              installSlotType: assignment.slotType,
              installSlotName: assignment.slotName,
            },
          });

          await tx.stockMovement.create({
            data: {
              type: "TRANSFER",
              note: `Cập nhật vị trí slot trong ${parentAsset.serialNumber}: ${component.serialNumber} -> ${assignment.slotName}.`,
              assetId: component.id,
              userId,
            },
          });
          count++;
        }

        return { count };
      });

      return NextResponse.json({ data: { message: `Đã cập nhật ${result.count} vị trí slot.` } });
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

      const lockedParent = components.find((component) => component.parent?.status !== "IN_STOCK")?.parent;
      if (lockedParent) {
        throw new Error(`Chỉ được tháo/lắp linh kiện khi server đang ở trạng thái Trong kho. Vui lòng chuyển server ${lockedParent.serialNumber || ""} về Trong kho trước.`);
      }

      const result = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.asset.updateMany({
          where: { id: { in: componentIds }, parentId: { not: null } },
          data: {
            parentId: null,
            status: "IN_STOCK",
            rackId: null,
            rackUnit: null,
            installSlotType: null,
            installSlotName: null,
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
