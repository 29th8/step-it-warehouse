import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, props: Props) {
  try {
    const { id } = await props.params;
    const body = await req.json();
    const data: any = {};

    if (body.value !== undefined) data.value = String(body.value).trim();
    if (body.label !== undefined) data.label = body.label ? String(body.label).trim() : null;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder || 0);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const option = await prisma.productAttributeOption.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: option });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Giá trị option đã tồn tại" }, { status: 409 });
    }
    console.error("PATCH Product Attribute Option Error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật giá trị option" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: Props) {
  try {
    const { id } = await props.params;
    await prisma.productAttributeOption.delete({ where: { id } });
    return NextResponse.json({ message: "Đã xóa giá trị option" });
  } catch (error) {
    console.error("DELETE Product Attribute Option Error:", error);
    return NextResponse.json({ error: "Lỗi xóa giá trị option" }, { status: 500 });
  }
}
