import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    // Auth
    const session = await getServerSession(authOptions);
    const sessionIdentifier = session?.user?.name || (session?.user as any)?.username;
    if (!sessionIdentifier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUser = await prisma.user.findFirst({
      where: { OR: [{ username: sessionIdentifier }, { name: sessionIdentifier }] },
    });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();

    // Support both single (componentId) and bulk (componentIds)
    const componentIds: string[] = body.componentIds ?? (body.componentId ? [body.componentId] : []);
    const { targetAssetId } = body;

    if (componentIds.length === 0 || !targetAssetId) {
      return NextResponse.json({ error: "Thiếu componentId(s) hoặc targetAssetId" }, { status: 400 });
    }

    // 1. Lấy target asset
    const target = await prisma.asset.findUnique({
      where: { id: targetAssetId },
      include: { product: { select: { name: true } } },
    });
    if (!target) return NextResponse.json({ error: "Không tìm thấy thiết bị đích" }, { status: 404 });
    if (target.parentId !== null) {
      return NextResponse.json({ error: "Thiết bị đích không phải là thiết bị cha" }, { status: 400 });
    }

    // 2. Lấy tất cả components
    const components = await prisma.asset.findMany({
      where: { id: { in: componentIds } },
      include: {
        product: { select: { name: true } },
        parent: { select: { serialNumber: true, product: { select: { name: true } } } },
      },
    });

    // 3. Validate từng component
    for (const component of components) {
      if (!component.parentId) {
        return NextResponse.json({ error: `Linh kiện ${component.serialNumber} chưa được gắn vào thiết bị nào` }, { status: 400 });
      }
      if (component.parentId === targetAssetId) {
        return NextResponse.json({ error: `Linh kiện ${component.serialNumber} đã thuộc về thiết bị này rồi` }, { status: 400 });
      }
    }

    // 4. Transaction: update + log tất cả
    await prisma.$transaction(async (tx) => {
      await tx.asset.updateMany({
        where: { id: { in: componentIds } },
        data: { parentId: targetAssetId },
      });

      for (const component of components) {
        const oldParentSerial = component.parent?.serialNumber || "N/A";
        const oldParentName = component.parent?.product?.name || "";
        await tx.stockMovement.create({
          data: {
            type: "TRANSFER",
            note: `Di chuyển linh kiện ${component.product.name} (${component.serialNumber}) từ ${oldParentName} (${oldParentSerial}) sang ${target.product.name} (${target.serialNumber})`,
            asset: { connect: { id: component.id } },
            user: { connect: { id: currentUser.id } },
          },
        });
      }
    });

    const count = components.length;
    return NextResponse.json({
      message: count === 1
        ? `Đã di chuyển ${components[0].product.name} sang ${target.product.name} (${target.serialNumber})`
        : `Đã di chuyển ${count} linh kiện sang ${target.product.name} (${target.serialNumber})`,
    });
  } catch (error) {
    console.error("Move Component Error:", error);
    return NextResponse.json({ error: "Lỗi di chuyển linh kiện" }, { status: 500 });
  }
}
