import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getManualStatusChangeError } from "@/lib/asset-status-rules";

const allowedTransitions: Record<string, string[]> = {
  IN_STOCK: ["RESERVED", "DEPLOYED", "INSTALLED", "RENTED", "FAULTY", "MAINTENANCE", "DISPOSED"],
  RESERVED: ["DEPLOYED", "IN_STOCK"],
  DEPLOYED: ["MAINTENANCE", "FAULTY", "IN_STOCK", "INSTALLED", "DISPOSED"],
  INSTALLED: ["IN_STOCK", "MAINTENANCE", "FAULTY", "DISPOSED"],
  MAINTENANCE: ["IN_STOCK", "FAULTY", "DISPOSED"],
  RENTED: ["IN_STOCK", "FAULTY"],
  FAULTY: ["MAINTENANCE", "DISPOSED"],
  DISPOSED: [],
};

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

    const existingAsset = await prisma.asset.findUnique({
      where: { id },
      include: {
        rentalContracts: { where: { status: "ACTIVE" }, select: { id: true } },
        parent: { select: { status: true, serialNumber: true } },
        product: { include: { productCategory: true } },
      },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Không tìm thấy thiết bị." }, { status: 404 });
    }

    if (!status || status === existingAsset.status) {
      return NextResponse.json(existingAsset);
    }

    const manualStatusError = getManualStatusChangeError(existingAsset, status);
    if (manualStatusError) {
      return NextResponse.json({ error: manualStatusError }, { status: 400 });
    }

    const validTargets = allowedTransitions[existingAsset.status] || [];
    if (!validTargets.includes(status)) {
      return NextResponse.json({
        error: `Luồng nghiệp vụ không hợp lệ. Không thể chuyển trạng thái từ [${existingAsset.status}] sang [${status}].`
      }, { status: 400 });
    }

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
