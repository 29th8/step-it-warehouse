import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

function serializeAsset(asset: any): any {
    const product = asset.product
        ? {
            ...asset.product,
            category: asset.product.productCategory?.code || "",
            categoryName: asset.product.productCategory?.name || asset.product.productCategory?.code || "",
        }
        : asset.product;

    return {
        ...asset,
        product,
        components: Array.isArray(asset.components) ? asset.components.map(serializeAsset) : asset.components,
    };
}

export async function GET(req: Request, props: Props) {
    try {
        const { id } = await props.params;

        const rack = await prisma.rack.findUnique({
            where: { id },
            include: {
                warehouse: true,
                assets: {
                    where: { parentId: null }, // chỉ lấy thiết bị nguyên chiếc
                    include: {
                        product: { include: { productCategory: true } },
                        components: {  // linh kiện gắn trong
                            include: { product: { include: { productCategory: true } } }
                        }
                    }
                }
            }
        });

        if (!rack) {
            return NextResponse.json({ error: "Không tìm thấy tủ rack" }, { status: 404 });
        }

        return NextResponse.json({ data: { ...rack, assets: rack.assets.map(serializeAsset) } });
    } catch (error) {
        console.error("GET Rack Detail Error:", error);
        return NextResponse.json({ error: "Lỗi hệ thống khi tải chi tiết tủ rack" }, { status: 500 });
    }
}
