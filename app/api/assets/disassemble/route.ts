import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  const { parentId, childIds } = await req.json();

  const session = await getServerSession(authOptions);
  const sessionIdentifier = session?.user?.name || (session?.user as any)?.username;

  if (!sessionIdentifier) {
    return NextResponse.json({ error: "Unauthorized. Vui lòng đăng nhập!" }, { status: 401 });
  }

  const currentUser = await prisma.user.findFirst({
    where: { OR: [{ username: sessionIdentifier }, { name: sessionIdentifier }] }
  });

  if (!currentUser) return NextResponse.json({ error: "Tài khoản không tồn tại." }, { status: 404 });

  // 5️⃣ KHÓA THÁO LINH KIỆN KHI ĐANG THUÊ
  const parentAsset = await prisma.asset.findUnique({ where: { id: parentId } });
  if (!parentAsset) {
    return NextResponse.json({ error: "Không tìm thấy thiết bị mẹ." }, { status: 404 });
  }
  if (parentAsset.status === "RENTED") {
    return NextResponse.json(
      { error: "Không thể tháo linh kiện khỏi thiết bị đang được thuê." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.asset.updateMany({
      where: { id: { in: childIds }, parentId: parentId },
      data: {
        parentId: null,
        status: "IN_STOCK",
        rackId: null,
        rackUnit: null
      }
    });

    // Ghi log cho từng linh kiện tháo ra
    for (const id of childIds) {
      await tx.stockMovement.create({
        data: {
          assetId: id,
          type: "DISASSEMBLE",
          note: `Tháo rời từ thiết bị cha: ${parentId}`,
          userId: currentUser.id
        }
      });
    }
  });

  return NextResponse.json({ message: "Tháo rời thành công" });
}