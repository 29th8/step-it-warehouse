import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    // 1. BẢO MẬT & LẤY USER ID
    const session = await getServerSession(authOptions);
    const sessionIdentifier = session?.user?.name || (session?.user as any)?.username;
    if (!sessionIdentifier) {
      return NextResponse.json({ error: "Unauthorized. Vui lòng đăng nhập!" }, { status: 401 });
    }
    const currentUser = await prisma.user.findFirst({
      where: { OR: [{ username: sessionIdentifier }, { name: sessionIdentifier }] }
    });
    if (!currentUser) {
      return NextResponse.json({ error: "Tài khoản không tồn tại." }, { status: 404 });
    }
    const userId = currentUser.id;

    // 2. LẤY DỮ LIỆU
    const { componentId, parentAssetId } = await req.json();

    if (!parentAssetId) {
      return NextResponse.json({ error: "Thiếu ID của thiết bị mẹ." }, { status: 400 });
    }

    if (!componentId) {
      return NextResponse.json({ error: "Thiếu ID của linh kiện cần lắp ráp." }, { status: 400 });
    }

    // 4️⃣ KHÓA LẮP RÁP KHI ASSET ĐANG THUÊ
    const parentAssetObj = await prisma.asset.findUnique({ where: { id: parentAssetId } });
    if (!parentAssetObj) {
      return NextResponse.json({ error: "Không tìm thấy thiết bị mẹ." }, { status: 404 });
    }
    if (parentAssetObj.status === "RENTED") {
      return NextResponse.json(
        { error: "Không thể lắp ráp linh kiện vào thiết bị đang được thuê." },
        { status: 400 }
      );
    }

    // 6️⃣ KHÓA GẮN COMPONENT ĐÃ ĐƯỢC SỬ DỤNG
    const componentAssetObj = await prisma.asset.findUnique({ where: { id: componentId } });
    if (!componentAssetObj) {
      return NextResponse.json({ error: "Không tìm thấy linh kiện." }, { status: 404 });
    }
    if (componentAssetObj.parentId) {
      return NextResponse.json(
        { error: "Linh kiện này đã được gắn vào thiết bị khác." },
        { status: 400 }
      );
    }

    // 3. THỰC THI TRANSACTION
    await prisma.$transaction(async (tx) => {
      // Lấy thông tin máy mẹ để ghi log cho đẹp
      const parentAsset = await tx.asset.findUnique({ where: { id: parentAssetId } });
      if (!parentAsset) throw new Error("Không tìm thấy thiết bị mẹ.");

      // Cập nhật Linh kiện con
      await tx.asset.update({
        where: { id: componentId },
        data: {
          parentId: parentAssetId, // Gắn vào máy mẹ
          status: "INSTALLED",       // Linh kiện đã lắp trong server, vẫn theo tồn kho vật lý của server
          // Tự động cập nhật vị trí của linh kiện theo vị trí của máy mẹ
          warehouseId: parentAsset.warehouseId,
          rackId: parentAsset.rackId,
          rackUnit: parentAsset.rackUnit,
        },
      });

      // Ghi log Lịch sử cho Linh kiện con
      await tx.stockMovement.create({
        data: {
          type: "ASSEMBLE",
          note: `Được lắp ráp vào thiết bị "${parentAsset.serialNumber}".`,
          asset: { connect: { id: componentId } },
          user: { connect: { id: userId } },
        },
      });
    });

    return NextResponse.json({ message: "Lắp ráp linh kiện thành công!" }, { status: 200 });

  } catch (error: any) {
    console.error("Assemble Asset Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống khi lắp ráp." }, { status: 500 });
  }
}
