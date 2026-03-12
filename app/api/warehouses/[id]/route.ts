import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type Props = { params: Promise<{ id: string }> };

// PATCH: CẬP NHẬT (Gỡ bỏ description)
export async function PATCH(req: Request, props: Props) {
  try {
    const { id } = await props.params;
    const data = await req.json();
    if (!data.name) {
      return NextResponse.json({ error: "Tên kho là bắt buộc" }, { status: 400 });
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: {
        name: data.name,
        location: data.location || null,
      }
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await prisma.stockMovement.create({
        data: {
          type: "UPDATE_WAREHOUSE",
          note: `Cập nhật kho: ${updated.name}`,
          userId: session.user.id,
        }
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Lỗi cập nhật kho" }, { status: 500 });
  }
}

// DELETE: XÓA AN TOÀN (Giữ nguyên logic)
export async function DELETE(req: Request, props: Props) {
  try {
    const { id } = await props.params;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: { _count: { select: { assets: true, racks: true } } }
    });

    if (!warehouse) {
      return NextResponse.json({ error: "Không tìm thấy kho để xóa" }, { status: 404 });
    }

    if (warehouse._count.assets > 0 || warehouse._count.racks > 0) {
      return NextResponse.json(
        { error: `Không thể xóa kho này vì đang chứa ${warehouse._count.racks} tủ rack và ${warehouse._count.assets} thiết bị.` },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);

    await prisma.$transaction(async (tx) => {
      await tx.warehouse.delete({ where: { id } });

      if (session?.user?.id) {
        await tx.stockMovement.create({
          data: {
            type: "DELETE_WAREHOUSE",
            note: `Xóa kho: ${warehouse.name}`,
            userId: session.user.id,
          }
        });
      }
    });

    return NextResponse.json({ message: "Đã xóa kho thành công" });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống khi xóa kho" }, { status: 500 });
  }
}