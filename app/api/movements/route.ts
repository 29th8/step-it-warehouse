import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: {
        asset: {
          include: {
            product: true,
          },
        },
        // ĐÃ BỔ SUNG: Lấy thông tin User thực hiện
        user: {
          select: {
            name: true,
            username: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: movements }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET Movements Error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải lịch sử hệ thống" },
      { status: 500 }
    );
  }
}