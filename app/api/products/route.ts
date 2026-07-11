import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";
import { ProductSchema } from "@/lib/validations/product";

function serializeProduct(product: any) {
  return {
    ...product,
    category: product.productCategory?.code || "",
    categoryName: product.productCategory?.name || product.productCategory?.code || "",
  };
}

async function findCategory(category: string) {
  return prisma.productCategory.findFirst({
    where: {
      OR: [
        { id: category },
        { code: category.toUpperCase() },
      ],
    },
  });
}

async function validateRequiredAttributes(categoryId: string, attributes: Record<string, any> | null | undefined) {
  const definitions = await prisma.productAttributeDefinition.findMany({
    where: { categoryId, isActive: true, required: true },
    select: { key: true, label: true },
    orderBy: { sortOrder: "asc" },
  });

  const missing = definitions.filter((definition) => {
    const value = attributes?.[definition.key];
    return value === undefined || value === null || String(value).trim() === "";
  });

  return missing.map((definition) => definition.label);
}

function validateRackUnitHeight(attributes: Record<string, any> | null | undefined) {
  const rawValue = attributes?.uHeight;
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") return null;

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return "Chiều cao rack (U) phải là số nguyên lớn hơn hoặc bằng 1.";
  }

  return null;
}

function sanitizeAttributesForCategory(isMain: boolean, attributes: Record<string, any> | null | undefined) {
  const sanitized = { ...(attributes || {}) };
  if (!isMain) delete sanitized.uHeight;
  return sanitized;
}

// GET: LẤY DANH SÁCH (Hỗ trợ Filter Taxonomy & Kèm số lượng Asset)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const q = searchParams.get("search");
    const limit = searchParams.get("take");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "0", 10);

    // Dynamic attributes
    const generation = searchParams.get("generation");
    const capacity = searchParams.get("capacity");
    const storageInterface = searchParams.get("interface");
    const series = searchParams.get("series");
    const attrType = searchParams.get("attrType");

    const whereClause: any = { AND: [] };

    if (category) {
      whereClause.productCategory = {
        OR: [
          { id: category },
          { code: category.toUpperCase() },
        ],
      };
    }
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

    if (pageSize > 0) {
      const [products, total] = await prisma.$transaction([
        prisma.product.findMany({
          where: whereClause,
          include: {
            productCategory: true,
            _count: {
              select: { assets: true } // Đếm số lượng tài sản thực tế trong kho
            }
          },
          take: pageSize,
          skip: (page - 1) * pageSize,
          orderBy: { name: 'asc' } // Sắp xếp theo tên cho dễ tìm kiếm trên dropdown
        }),
        prisma.product.count({ where: whereClause }),
      ]);

      return NextResponse.json({
        data: products.map(serializeProduct),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      });
    }

    const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          productCategory: true,
          _count: {
            select: { assets: true } // Đếm số lượng tài sản thực tế trong kho
          }
        },
        take: limit ? parseInt(limit, 10) : undefined,
        orderBy: { name: 'asc' } // Sắp xếp theo tên cho dễ tìm kiếm trên dropdown
      });

    return NextResponse.json(products.map(serializeProduct));
  } catch (error) {
    return NextResponse.json({ error: "Lỗi tải danh mục sản phẩm" }, { status: 500 });
  }
}

// POST: TẠO MỚI DANH MỤC
export async function POST(req: Request) {
  try {
    const rawData = await req.json();
    const data = ProductSchema.parse(rawData); // Zod sẽ throw lỗi nếu không hợp lệ
    const category = await findCategory(data.category);
    if (!category) {
      return NextResponse.json({ error: "Danh mục sản phẩm không tồn tại" }, { status: 400 });
    }

    const attributes = sanitizeAttributesForCategory(category.isMain, data.attributes || {});
    const missingAttributes = await validateRequiredAttributes(category.id, attributes);
    if (missingAttributes.length > 0) {
      return NextResponse.json({ error: `Vui lòng nhập: ${missingAttributes.join(", ")}` }, { status: 400 });
    }

    const rackUnitHeightError = category.isMain ? validateRackUnitHeight(attributes) : null;
    if (rackUnitHeightError) {
      return NextResponse.json({ error: rackUnitHeightError }, { status: 400 });
    }

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
        productCategory: { connect: { id: category.id } },
        type: normalizedType,
        vendor: data.vendor,
        description: data.description,
        attributes
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
