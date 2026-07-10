import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  { code: "SERVER", name: "Server", isMain: true },
  { code: "NETWORK", name: "Thiết bị mạng", isMain: true },
  { code: "MEMORY", name: "RAM / Bộ nhớ", isMain: false },
  { code: "STORAGE", name: "Lưu trữ", isMain: false },
  { code: "CPU", name: "CPU", isMain: false },
  { code: "GPU", name: "GPU", isMain: false },
  { code: "ACCESSORY", name: "Phụ kiện", isMain: false },
];

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

async function ensureDefaultCategories() {
  const count = await prisma.productCategory.count();
  if (count > 0) return;

  await prisma.productCategory.createMany({
    data: DEFAULT_CATEGORIES,
    skipDuplicates: true,
  });
}

export async function GET() {
  try {
    await ensureDefaultCategories();

    const categories = await prisma.productCategory.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("GET Product Categories Error:", error);
    return NextResponse.json({ error: "Lỗi tải danh mục sản phẩm" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = normalizeCode(body.code || body.name || "");
    const name = String(body.name || "").trim();

    if (!code || !name) {
      return NextResponse.json({ error: "Mã và tên danh mục là bắt buộc" }, { status: 400 });
    }

    const category = await prisma.productCategory.create({
      data: {
        code,
        name,
        description: body.description || null,
        isMain: Boolean(body.isMain),
      },
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Mã danh mục đã tồn tại" }, { status: 409 });
    }
    console.error("POST Product Category Error:", error);
    return NextResponse.json({ error: "Lỗi tạo danh mục" }, { status: 500 });
  }
}

