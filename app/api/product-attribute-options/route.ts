import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const definitionId = String(body.definitionId || "").trim();
    const orderedOptionIds = Array.isArray(body.orderedOptionIds)
      ? body.orderedOptionIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];

    if (!definitionId || orderedOptionIds.length === 0) {
      return NextResponse.json({ error: "Thuộc tính và danh sách thứ tự là bắt buộc" }, { status: 400 });
    }

    if (new Set(orderedOptionIds).size !== orderedOptionIds.length) {
      return NextResponse.json({ error: "Danh sách thứ tự chứa giá trị trùng lặp" }, { status: 400 });
    }

    const existingOptions = await prisma.productAttributeOption.findMany({
      where: { definitionId },
      select: { id: true },
    });
    const existingIds = new Set(existingOptions.map((option) => option.id));

    if (
      existingOptions.length !== orderedOptionIds.length
      || orderedOptionIds.some((id: string) => !existingIds.has(id))
    ) {
      return NextResponse.json({ error: "Danh sách giá trị không khớp với thuộc tính" }, { status: 400 });
    }

    await prisma.$transaction(
      orderedOptionIds.map((id: string, index: number) =>
        prisma.productAttributeOption.update({
          where: { id },
          data: { sortOrder: (index + 1) * 10 },
        })
      )
    );

    const options = await prisma.productAttributeOption.findMany({
      where: { definitionId },
      orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
    });

    return NextResponse.json({ data: options });
  } catch (error) {
    console.error("PATCH Product Attribute Option Order Error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật thứ tự giá trị" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const definitionId = String(body.definitionId || "").trim();
    const value = String(body.value || "").trim();
    const label = body.label ? String(body.label).trim() : value;

    if (!definitionId || !value) {
      return NextResponse.json({ error: "Thuộc tính và giá trị là bắt buộc" }, { status: 400 });
    }

    const option = await prisma.productAttributeOption.create({
      data: {
        definitionId,
        value,
        label,
        sortOrder: Number(body.sortOrder || 0),
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      },
    });

    return NextResponse.json({ data: option }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Giá trị option đã tồn tại" }, { status: 409 });
    }
    console.error("POST Product Attribute Option Error:", error);
    return NextResponse.json({ error: "Lỗi tạo giá trị option" }, { status: 500 });
  }
}
