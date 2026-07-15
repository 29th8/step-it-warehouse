import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";
import { ProductSchema } from "@/lib/validations/product";

type Props = { params: Promise<{ id: string }> };

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
  const positiveIntegerAttributes: Record<string, string> = {
    uHeight: "Chiều cao rack (U)",
    dimmSlots: "Số khe RAM (DIMM)",
    driveBays: "Số bay ổ cứng",
  };

  for (const [key, label] of Object.entries(positiveIntegerAttributes)) {
    const rawValue = attributes?.[key];
    if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") continue;

    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return `${label} phải là số nguyên lớn hơn hoặc bằng 1.`;
    }
  }

  return null;
}

function sanitizeAttributesForCategory(categoryCode: string, isMain: boolean, attributes: Record<string, any> | null | undefined) {
  const sanitized = { ...(attributes || {}) };
  if (!isMain) delete sanitized.uHeight;
  if (categoryCode !== "SERVER") {
    for (const key of ["dimmSlots", "driveBays", "ramGeneration", "ramType", "driveFormFactor", "driveInterface"]) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

// GET CHI TIẾT
export async function GET(req: Request, props: Props) {
  try {
    const { id } = await props.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { productCategory: true, _count: { select: { assets: true } } }
    });
    if (!product) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return NextResponse.json(serializeProduct(product));
  } catch (error) {
    return NextResponse.json({ error: "Lỗi Server" }, { status: 500 });
  }
}

// PATCH: SỬA THÔNG TIN
export async function PATCH(req: Request, props: Props) {
  try {
    const { id } = await props.params;
    const rawData = await req.json();
    const data = ProductSchema.parse(rawData);
    const category = await findCategory(data.category);
    if (!category) {
      return NextResponse.json({ error: "Danh mục sản phẩm không tồn tại" }, { status: 400 });
    }

    const attributes = sanitizeAttributesForCategory(category.code, category.isMain, data.attributes || {});
    const missingAttributes = await validateRequiredAttributes(category.id, attributes);
    if (missingAttributes.length > 0) {
      return NextResponse.json({ error: `Vui lòng nhập: ${missingAttributes.join(", ")}` }, { status: 400 });
    }

    const rackUnitHeightError = category.isMain ? validateRackUnitHeight(attributes) : null;
    if (rackUnitHeightError) {
      return NextResponse.json({ error: rackUnitHeightError }, { status: 400 });
    }

    // Normalization: standardize type value
    const normalizedType = data.type ? data.type.toUpperCase() : null;

    const updated = await prisma.product.update({
      where: { id },
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
          type: "UPDATE_PRODUCT",
          note: `Cập nhật sản phẩm: ${updated.name}`,
          userId: session.user.id,
        }
      });
    }

    return NextResponse.json(serializeProduct({ ...updated, productCategory: category }));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const zodError = error as any;
      return NextResponse.json({ error: zodError.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Lỗi cập nhật sản phẩm" }, { status: 500 });
  }
}

// DELETE: XÓA VÀ RÀNG BUỘC NGHIÊM NGẶT
export async function DELETE(req: Request, props: Props) {
  try {
    const { id } = await props.params;

    // 1. Kiểm tra ràng buộc: Sản phẩm này có Asset nào đang dùng không?
    const product = await prisma.product.findUnique({
      where: { id },
      include: { productCategory: true, _count: { select: { assets: true } } }
    });

    if (!product) return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });

    if (product._count.assets > 0) {
      return NextResponse.json(
        { error: `Không thể xóa sản phẩm này vì đang có ${product._count.assets} thiết bị thuộc loại này trong kho.` },
        { status: 400 } // Trả về 400 Bad Request
      );
    }

    // 2. Nếu = 0, cho phép xóa
    const session = await getServerSession(authOptions);

    await prisma.$transaction(async (tx) => {
      await tx.product.delete({ where: { id } });

      if (session?.user?.id) {
        await tx.stockMovement.create({
          data: {
            type: "DELETE_PRODUCT",
            note: `Xóa sản phẩm: ${product.name}`,
            userId: session.user.id,
          }
        });
      }
    });

    return NextResponse.json({ message: "Đã xóa danh mục thành công" });

  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống khi xóa" }, { status: 500 });
  }
}
