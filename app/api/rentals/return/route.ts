import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const { contractId } = await req.json();
    if (!contractId) {
      return NextResponse.json({ error: "Thiếu ID của hợp đồng" }, { status: 400 });
    }

    const updatedContract = await prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái hợp đồng thành Đã Trả
      const contract = await tx.rentalContract.update({
        where: { id: contractId },
        data: { status: 'RETURNED' },
        include: { asset: true } // Lấy assetId để cập nhật
      });

      // 2. Cập nhật trạng thái thiết bị thành Trong Kho
      await tx.asset.update({
        where: { id: contract.assetId },
        data: { status: 'IN_STOCK' }
      });

      // 3. Ghi log lịch sử hệ thống
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        await tx.stockMovement.create({
          data: {
            type: "RETURN_RENTAL",
            note: `Khách hàng trả lại thiết bị ${contract.asset.serialNumber}`,
            userId: session.user.id,
            assetId: contract.assetId
          }
        });
      }

      return contract;
    });

    return NextResponse.json({ data: updatedContract });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống khi xử lý trả thiết bị" }, { status: 500 });
  }
}