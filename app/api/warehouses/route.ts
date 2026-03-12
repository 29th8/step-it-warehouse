import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET: LẤY DANH SÁCH KHO, KÈM THEO DANH SÁCH RACK CON
export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        // BAO GỒM TOÀN BỘ DANH SÁCH RACK
        racks: {
          include: {
            _count: { select: { assets: true } } // Đếm số asset trong từng rack
          },
          orderBy: { name: "asc" }
        },
        // ĐỒNG THỜI ĐẾM TỔNG SỐ LƯỢNG
        _count: {
          select: { assets: true, racks: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Trả về theo format { data: [...] } để Frontend dễ xử lý
    return NextResponse.json({ data: warehouses });

  } catch (error) {
    console.error("GET Warehouses Error:", error);
    return NextResponse.json({ error: "Lỗi tải danh sách kho" }, { status: 500 });
  }
}

// POST: TẠO KHO MỚI (Gỡ bỏ description)
export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (!data.name) {
      return NextResponse.json({ error: "Tên kho là bắt buộc" }, { status: 400 });
    }

    const newWarehouse = await prisma.warehouse.create({
      data: {
        name: data.name,
        location: data.location || null,
      }
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await prisma.stockMovement.create({
        data: {
          type: "CREATE_WAREHOUSE",
          note: `Tạo kho mới: ${newWarehouse.name}`,
          userId: session.user.id,
        }
      });
    }

    return NextResponse.json(newWarehouse, { status: 201 });
  } catch (error) {
    console.error("POST Warehouse Error:", error);
    return NextResponse.json({ error: "Lỗi tạo kho mới" }, { status: 500 });
  }
}