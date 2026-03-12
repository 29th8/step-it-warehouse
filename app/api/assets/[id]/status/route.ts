import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await params;
    const { status, note } = await req.json();

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: { status },
    });

    // Ghi log biến động
    await prisma.stockMovement.create({
      data: {
        assetId: id,
        type: "TRANSFER",
        note: `Cập nhật trạng thái qua Mobile Scan: ${status}. ${note || ""}`,
        userId: currentUser.id,
      }
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    return NextResponse.json({ error: "Lỗi cập nhật" }, { status: 500 });
  }
}