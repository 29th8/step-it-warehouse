import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [inStockCount, deployedCount, maintenanceCount, faultyCount, rentedCount, alerts, categoryStats] = await Promise.all([
      // 1. Đếm số lượng theo trạng thái
      prisma.asset.count({ where: { status: "IN_STOCK" } }),
      prisma.asset.count({ where: { status: "DEPLOYED" } }),
      prisma.asset.count({ where: { status: "MAINTENANCE" } }),
      prisma.asset.count({ where: { status: "FAULTY" } }),
      prisma.asset.count({ where: { status: "RENTED" } }),

      // 2. Lấy 5 thiết bị lỗi/bảo trì mới nhất để cảnh báo
      prisma.asset.findMany({
        where: {
          status: { in: ["FAULTY", "MAINTENANCE"] }
        },
        include: {
          product: true,
          warehouse: true
        },
        orderBy: { updatedAt: "desc" },
        take: 5
      }),

      // 3. Thống kê theo Danh mục (Category)
      prisma.product.findMany({
        select: {
          category: true,
          _count: {
            select: { assets: true }
          }
        }
      })
    ]);

    // 4. Lấy hợp đồng cho thuê sắp hết hạn (<= 14 ngày hoặc đã qua hạn)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const next14Days = new Date(now);
    next14Days.setDate(next14Days.getDate() + 14);

    const expiringRentals = await prisma.rentalContract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: next14Days }
      },
      include: {
        asset: { include: { product: true } }
      },
      orderBy: { endDate: 'asc' }
    });

    // Xử lý dữ liệu categoryStats để nhóm lại
    const statsByCategory = categoryStats.reduce((acc: any, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr._count.assets;
      return acc;
    }, {});

    return NextResponse.json({
      summary: {
        inStock: inStockCount,
        deployed: deployedCount,
        maintenance: maintenanceCount,
        faulty: faultyCount,
        rented: rentedCount,
        total: inStockCount + deployedCount + maintenanceCount + faultyCount + rentedCount
      },
      alerts,
      statsByCategory,
      expiringRentals
    });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi lấy dữ liệu dashboard" }, { status: 500 });
  }
}