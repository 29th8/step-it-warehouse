import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

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
                        product: true,
                        components: {  // linh kiện gắn trong
                            include: { product: true }
                        }
                    }
                }
            }
        });

        if (!rack) {
            return NextResponse.json({ error: "Không tìm thấy tủ rack" }, { status: 404 });
        }

        return NextResponse.json({ data: rack });
    } catch (error) {
        console.error("GET Rack Detail Error:", error);
        return NextResponse.json({ error: "Lỗi hệ thống khi tải chi tiết tủ rack" }, { status: 500 });
    }
}