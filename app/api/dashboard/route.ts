import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, format } from "date-fns";

export async function GET() {
  try {
    const [inStockCount, deployedCount, maintenanceCount, faultyCount, rentedCount, alerts, categoryStats] = await Promise.all([
      prisma.asset.count({ where: { status: "IN_STOCK", deletedAt: null } }),
      prisma.asset.count({ where: { status: "DEPLOYED", deletedAt: null } }),
      prisma.asset.count({ where: { status: "MAINTENANCE", deletedAt: null } }),
      prisma.asset.count({ where: { status: "FAULTY", deletedAt: null } }),
      prisma.asset.count({ where: { status: "RENTED", deletedAt: null } }),
      prisma.asset.findMany({
        where: { status: { in: ["FAULTY", "MAINTENANCE"] }, deletedAt: null },
        include: { product: true, warehouse: true },
        orderBy: { updatedAt: "desc" },
        take: 5
      }),
      prisma.product.findMany({
        select: { category: true, _count: { select: { assets: true } } }
      })
    ]);

    // Hợp đồng sắp hết hạn
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const next14Days = new Date(now); next14Days.setDate(next14Days.getDate() + 14);
    const expiringRentals = await prisma.rentalContract.findMany({
      where: { status: 'ACTIVE', endDate: { lte: next14Days } },
      include: { asset: { include: { product: true } } },
      orderBy: { endDate: 'asc' }
    });

    // Trend 7 ngày gần nhất (số thiết bị nhập kho mỗi ngày)
    const trend7Days = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const day = startOfDay(subDays(now, 6 - i));
        const nextDay = startOfDay(subDays(now, 5 - i));
        return prisma.asset.count({
          where: { createdAt: { gte: day, lt: nextDay }, deletedAt: null }
        }).then(count => ({ date: format(day, 'dd/MM'), count }));
      })
    );

    const statsByCategory = categoryStats.reduce((acc: any, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr._count.assets;
      return acc;
    }, {});

    const CATEGORY_VI: Record<string, string> = {
      SERVER: "Máy chủ",
      MEMORY: "RAM",
      STORAGE: "Ổ cứng",
      NETWORK: "Thiết bị mạng",
      ACCESSORY: "Phụ kiện",
    };
    const categoryChartData = Object.entries(statsByCategory).map(([name, value]) => ({
      name: CATEGORY_VI[name] || name,
      value,
    }));

    const statusChartData = [
      { name: "Trong kho", value: inStockCount, color: "#22c55e" },
      { name: "Đang dùng", value: deployedCount, color: "#3b82f6" },
      { name: "Đang thuê", value: rentedCount, color: "#8b5cf6" },
      { name: "Bảo trì", value: maintenanceCount, color: "#f59e0b" },
      { name: "Hỏng", value: faultyCount, color: "#ef4444" },
    ].filter(d => d.value > 0);

    return NextResponse.json({
      summary: {
        inStock: inStockCount, deployed: deployedCount,
        maintenance: maintenanceCount, faulty: faultyCount,
        rented: rentedCount,
        total: inStockCount + deployedCount + maintenanceCount + faultyCount + rentedCount
      },
      alerts,
      statsByCategory,
      categoryChartData,
      statusChartData,
      trend7Days,
      expiringRentals
    });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi lấy dữ liệu dashboard" }, { status: 500 });
  }
}
