import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/products/taxonomy?field=category|type|specification&category=...&type=...
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const field = searchParams.get("field");
        const category = searchParams.get("category");
        const type = searchParams.get("type");

        if (!field || !["category", "type", "specification", "brand"].includes(field)) {
            return NextResponse.json({ error: "Tham số 'field' không hợp lệ." }, { status: 400 });
        }

        if (field === "category") {
            const categories = await prisma.productCategory.findMany({
                orderBy: [{ isMain: "desc" }, { name: "asc" }],
            });
            return NextResponse.json(categories.map(c => c.code));
        }

        const whereClause: any = {};
        if (category) {
            whereClause.productCategory = {
                OR: [{ id: category }, { code: category.toUpperCase() }],
            };
        }
        if (type) whereClause.type = type;

        // Lấy danh sách các giá trị distinct của field được yêu cầu
        const distinctRecords = await prisma.product.findMany({
            where: whereClause,
            select: {
                [field]: true,
            },
            distinct: [field as any],
            orderBy: {
                [field]: 'asc'
            }
        });

        // Trích xuất thành mảng string phẳng, loại bỏ null/undefined
        const results = distinctRecords
            .map((r: any) => r[field])
            .filter(Boolean);

        return NextResponse.json(results);
    } catch (error) {
        console.error("Taxonomy API Error:", error);
        return NextResponse.json({ error: "Lỗi tải dữ liệu phân loại." }, { status: 500 });
    }
}
