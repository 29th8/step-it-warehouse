import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductAttributeInputType } from "@prisma/client";

function normalizeKey(value: string) {
  return value.trim().replace(/\s+/g, "_");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const definitions = await prisma.productAttributeDefinition.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(category
          ? {
            category: {
              OR: [{ id: category }, { code: category.toUpperCase() }],
            },
          }
          : {}),
      },
      include: {
        category: true,
        options: {
          where: activeOnly ? { isActive: true } : undefined,
          orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
        },
      },
      orderBy: [{ category: { name: "asc" } }, { sortOrder: "asc" }, { label: "asc" }],
    });

    return NextResponse.json({ data: definitions });
  } catch (error) {
    console.error("GET Product Attribute Definitions Error:", error);
    return NextResponse.json({ error: "Lỗi tải cấu hình thuộc tính" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const categoryId = String(body.categoryId || "").trim();
    const key = normalizeKey(String(body.key || ""));
    const label = String(body.label || "").trim();
    const inputType = String(body.inputType || "TEXT").toUpperCase() as ProductAttributeInputType;

    if (!categoryId || !key || !label) {
      return NextResponse.json({ error: "Danh mục, key và tên hiển thị là bắt buộc" }, { status: 400 });
    }

    if (!Object.values(ProductAttributeInputType).includes(inputType)) {
      return NextResponse.json({ error: "Kiểu nhập không hợp lệ" }, { status: 400 });
    }

    const definition = await prisma.productAttributeDefinition.create({
      data: {
        categoryId,
        key,
        label,
        inputType,
        required: Boolean(body.required),
        sortOrder: Number(body.sortOrder || 0),
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      },
      include: { category: true, options: true },
    });

    return NextResponse.json({ data: definition }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Key thuộc tính đã tồn tại trong danh mục này" }, { status: 409 });
    }
    console.error("POST Product Attribute Definition Error:", error);
    return NextResponse.json({ error: "Lỗi tạo thuộc tính" }, { status: 500 });
  }
}
