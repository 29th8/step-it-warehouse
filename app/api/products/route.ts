import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";
import { ProductSchema } from "@/lib/validations/product";

// GET: LẤY DANH SÁCH (Hỗ trợ Filter Taxonomy & Kèm số lượng Asset)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const q = searchParams.get("search");
    const limit = searchParams.get("take");

    // Dynamic attributes
    const generation = searchParams.get("generation");
    const capacity = searchParams.get("capacity");
    const storageInterface = searchParams.get("interface");
    const series = searchParams.get("series");
    const attrType = searchParams.get("attrType");

    const whereClause: any = { AND: [] };

    if (category) whereClause.category = category;
    if (type) whereClause.type = type;

    if (q) {
      whereClause.AND.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { modelNumber: { contains: q, mode: "insensitive" } },
          { vendor: { contains: q, mode: "insensitive" } }
        ]
      });
    }

    if (generation) whereClause.AND.push({ attributes: { path: ["generation"], equals: generation } });
    if (capacity) whereClause.AND.push({ attributes: { path: ["capacity"], string_contains: capacity } });
    if (storageInterface) whereClause.AND.push({ attributes: { path: ["interface"], equals: storageInterface } });
    if (series) whereClause.AND.push({ attributes: { path: ["series"], equals: series } });
    if (attrType) whereClause.AND.push({ attributes: { path: ["type"], equals: attrType } });

    if (whereClause.AND.length === 0) {
      delete whereClause.AND;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { assets: true } // Đếm số lượng tài sản thực tế trong kho
        }
      },
      take: limit ? parseInt(limit) : undefined,
      orderBy: { name: 'asc' } // Sắp xếp theo tên cho dễ tìm kiếm trên dropdown
    });
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: "Lỗi tải danh mục sản phẩm" }, { status: 500 });
  }
}

// POST: TẠO MỚI DANH MỤC
export async function POST(req: Request) {
  try {
    const rawData = await req.json();
    const data = ProductSchema.parse(rawData); // Zod sẽ throw lỗi nếu không hợp lệ

    // Bắt lỗi trùng Model Number (nếu Model là unique trong schema của bạn)
    const existing = await prisma.product.findUnique({ where: { modelNumber: data.modelNumber } });
    if (existing) {
      return NextResponse.json({ error: "Model Number này đã tồn tại!" }, { status: 400 });
    }

    // Nomalization: standardize type value
    const normalizedType = data.type ? data.type.toUpperCase() : null;

    const newProduct = await prisma.product.create({
      data: {
        name: data.name,
        modelNumber: data.modelNumber,
        category: data.category,
        type: normalizedType,
        vendor: data.vendor,
        description: data.description,
        attributes: data.attributes || {}
      }
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await prisma.stockMovement.create({
        data: {
          type: "CREATE_PRODUCT",
          note: `Tạo sản phẩm mới: ${newProduct.name}`,
          userId: session.user.id,
        }
      });
    }

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const zodError = error as any;
      return NextResponse.json({ error: zodError.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Lỗi tạo mới sản phẩm" }, { status: 500 });
  }
}