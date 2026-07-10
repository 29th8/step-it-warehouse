import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

export async function PATCH(req: Request, props: Props) {
  try {
    const { id } = await props.params;
    const body = await req.json();
    const name = String(body.name || "").trim();
    const code = body.code ? normalizeCode(body.code) : undefined;

    if (!name) {
      return NextResponse.json({ error: "Tên danh mục là bắt buộc" }, { status: 400 });
    }

    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        ...(code ? { code } : {}),
        name,
        description: body.description || null,
        isMain: Boolean(body.isMain),
      },
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({ data: category });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Mã danh mục đã tồn tại" }, { status: 409 });
    }
    console.error("PATCH Product Category Error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật danh mục" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: Props) {
  try {
    const { id } = await props.params;
    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      return NextResponse.json({ error: "Không tìm thấy danh mục" }, { status: 404 });
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        { error: `Không thể xóa vì đang có ${category._count.products} sản phẩm thuộc danh mục này.` },
        { status: 400 }
      );
    }

    await prisma.productCategory.delete({ where: { id } });
    return NextResponse.json({ message: "Đã xóa danh mục" });
  } catch (error) {
    console.error("DELETE Product Category Error:", error);
    return NextResponse.json({ error: "Lỗi xóa danh mục" }, { status: 500 });
  }
}

