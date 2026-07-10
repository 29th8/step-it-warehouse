import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Giá trị option đã tồn tại" }, { status: 409 });
    }
    console.error("POST Product Attribute Option Error:", error);
    return NextResponse.json({ error: "Lỗi tạo giá trị option" }, { status: 500 });
  }
}
