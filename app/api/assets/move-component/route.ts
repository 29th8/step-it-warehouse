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

    const { componentId, targetAssetId } = await req.json();

    if (!componentId || !targetAssetId) {
      return NextResponse.json({ error: "Thiếu componentId hoặc targetAssetId" }, { status: 400 });
    }

    // 1. Lấy component
    const component = await prisma.asset.findUnique({
      where: { id: componentId },
      include: {
        product: { select: { name: true } },
        parent: { select: { serialNumber: true, product: { select: { name: true } } } },
      },
    });
    if (!component) return NextResponse.json({ error: "Không tìm thấy linh kiện" }, { status: 404 });

    // 2. Validate component có parent
    if (!component.parentId) {
      return NextResponse.json({ error: "Linh kiện này chưa được gắn vào thiết bị nào" }, { status: 400 });
    }

    // 3. Không cho phép move vào chính parent hiện tại
    if (component.parentId === targetAssetId) {
      return NextResponse.json({ error: "Linh kiện đã thuộc về thiết bị này rồi" }, { status: 400 });
    }

    // 4. Lấy target asset
    const target = await prisma.asset.findUnique({
      where: { id: targetAssetId },
      include: { product: { select: { name: true } } },
    });
    if (!target) return NextResponse.json({ error: "Không tìm thấy thiết bị đích" }, { status: 404 });

    // 5. Validate target là thiết bị cha (parentId = null)
    if (target.parentId !== null) {
      return NextResponse.json({ error: "Thiết bị đích không phải là thiết bị cha" }, { status: 400 });
    }

    const oldParentSerial = component.parent?.serialNumber || "N/A";
    const oldParentName = component.parent?.product?.name || "";

    // 6. Transaction: update + log
    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: componentId },
        data: { parentId: targetAssetId },
      });

      await tx.stockMovement.create({
        data: {
          type: "TRANSFER",
          note: `Di chuyển linh kiện ${component.product.name} (${component.serialNumber}) từ ${oldParentName} (${oldParentSerial}) sang ${target.product.name} (${target.serialNumber})`,
          asset: { connect: { id: componentId } },
          user: { connect: { id: currentUser.id } },
        },
      });
    });

    return NextResponse.json({
      message: `Đã di chuyển ${component.product.name} sang ${target.product.name} (${target.serialNumber})`,
    });
  } catch (error) {
    console.error("Move Component Error:", error);
    return NextResponse.json({ error: "Lỗi di chuyển linh kiện" }, { status: 500 });
  }
}
