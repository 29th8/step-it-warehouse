import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Props = { params: Promise<{ id: string }> };

export async function GET(req: Request, props: Props) {
  try {
    const { id } = await props.params;
    const searchParams = new URL(req.url).searchParams;
    const parsedPage = Number(searchParams.get("page") || 1);
    const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const pageSize = 20;
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        racks: {
          orderBy: { name: "asc" },
          include: { _count: { select: { assets: { where: { deletedAt: null, parentId: null } } } } },
        },
      },
    });
    if (!warehouse) return NextResponse.json({ error: "Không tìm thấy kho" }, { status: 404 });

    const base = { warehouseId: id, deletedAt: null };
    const outside = { ...base, rackId: null, parentId: null };
    const [mainCount, looseCount, installedCount, outsideCount, assets] = await prisma.$transaction([
      prisma.asset.count({ where: { ...base, parentId: null, product: { productCategory: { isMain: true } } } }),
      prisma.asset.count({ where: { ...base, parentId: null, product: { productCategory: { isMain: false } } } }),
      prisma.asset.count({ where: { ...base, parentId: { not: null } } }),
      prisma.asset.count({ where: outside }),
      prisma.asset.findMany({
        where: outside,
        include: { product: { include: { productCategory: true } }, warehouse: true, rack: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      data: {
        ...warehouse,
        counts: { main: mainCount, loose: looseCount, installed: installedCount, total: mainCount + looseCount + installedCount },
        outside: {
          data: assets.map((asset) => ({ ...asset, product: { ...asset.product, category: asset.product.productCategory.code } })),
          total: outsideCount,
          page,
          totalPages: Math.max(1, Math.ceil(outsideCount / pageSize)),
        },
      },
    });
  } catch (error) {
    console.error("GET Warehouse Detail Error:", error);
    return NextResponse.json({ error: "Lỗi tải chi tiết kho" }, { status: 500 });
  }
}

// PATCH: CẬP NHẬT (Gỡ bỏ description)
export async function PATCH(req: Request, props: Props) {
  try {
    const { id } = await props.params;
    const data = await req.json();
    if (!data.name) {
      return NextResponse.json({ error: "Tên kho là bắt buộc" }, { status: 400 });
    }

    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy kho" }, { status: 404 });

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
          note: `Cập nhật kho ${updated.name}: ${[
            existing.name !== updated.name && `tên ${existing.name} → ${updated.name}`,
            existing.location !== updated.location && "địa điểm",
          ].filter(Boolean).join(", ") || "không có thay đổi"}.`,
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
