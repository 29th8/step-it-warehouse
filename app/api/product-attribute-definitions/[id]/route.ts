import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductAttributeInputType } from "@prisma/client";

type Props = { params: Promise<{ id: string }> };

function normalizeKey(value: string) {
  return value.trim().replace(/\s+/g, "_");
}

export async function PATCH(req: Request, props: Props) {
  try {
    const { id } = await props.params;
    const body = await req.json();
    const data: any = {};

    if (body.categoryId !== undefined) data.categoryId = String(body.categoryId).trim();
    if (body.key !== undefined) data.key = normalizeKey(String(body.key));
    if (body.label !== undefined) data.label = String(body.label).trim();
    if (body.inputType !== undefined) {
      const inputType = String(body.inputType).toUpperCase() as ProductAttributeInputType;
      if (!Object.values(ProductAttributeInputType).includes(inputType)) {
        return NextResponse.json({ error: "Kiểu nhập không hợp lệ" }, { status: 400 });
      }
      data.inputType = inputType;
    }
    if (body.required !== undefined) data.required = Boolean(body.required);
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder || 0);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const definition = await prisma.productAttributeDefinition.update({
      where: { id },
      data,
      include: { category: true, options: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] } },
    });

    return NextResponse.json({ data: definition });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Key thuộc tính đã tồn tại trong danh mục này" }, { status: 409 });
    }
    console.error("PATCH Product Attribute Definition Error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật thuộc tính" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: Props) {
  try {
    const { id } = await props.params;
    await prisma.productAttributeDefinition.delete({ where: { id } });
    return NextResponse.json({ message: "Đã xóa thuộc tính" });
  } catch (error) {
    console.error("DELETE Product Attribute Definition Error:", error);
    return NextResponse.json({ error: "Lỗi xóa thuộc tính" }, { status: 500 });
  }
}
