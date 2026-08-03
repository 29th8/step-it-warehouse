import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, format } from "date-fns";

export async function GET() {
  try {
    const [
      activeTotalCount,
      warehouseStockCount,
      statusGroups,
      installedInWarehouseCount,
      alerts,
      categoryGroups,
    ] = await Promise.all([
      prisma.asset.count({ where: { deletedAt: null } }),
      prisma.asset.count({
        where: {
          deletedAt: null,
          OR: [
            { status: "IN_STOCK", parentId: null },
            { status: "IN_STOCK", parent: { status: "IN_STOCK" } },
            { status: "INSTALLED", parent: { status: "IN_STOCK" } },
          ],
        }
      }),
      prisma.asset.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      prisma.asset.count({ where: { status: "INSTALLED", parent: { status: "IN_STOCK" }, deletedAt: null } }),
      prisma.asset.findMany({
        where: { status: { in: ["FAULTY", "MAINTENANCE"] }, deletedAt: null },
        include: { product: { include: { productCategory: true } }, warehouse: true },
        orderBy: { updatedAt: "desc" },
        take: 5
      }),
      prisma.asset.groupBy({
        by: ["productId"],
        where: { deletedAt: null },
        _count: { _all: true },
      })
    ]);

    const statusCounts = statusGroups.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {});

    const [
      inStockLooseCount,
      installedCount,
      deployedCount,
      maintenanceCount,
      faultyCount,
      disposedCount,
      rentedCount,
      reservedCount,
      handedOverCount,
    ] = [
      statusCounts.IN_STOCK || 0,
      statusCounts.INSTALLED || 0,
      statusCounts.DEPLOYED || 0,
      statusCounts.MAINTENANCE || 0,
      statusCounts.FAULTY || 0,
      statusCounts.DISPOSED || 0,
      statusCounts.RENTED || 0,
      statusCounts.RESERVED || 0,
      statusCounts.HANDED_OVER || 0,
    ];

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

    const productsForCategoryStats = await prisma.product.findMany({
      where: { id: { in: categoryGroups.map((item) => item.productId) } },
      include: { productCategory: true },
    });

    const categoryByProductId = new Map(
      productsForCategoryStats.map((product) => [
        product.id,
        product.productCategory?.name || product.productCategory?.code || "Khác",
      ])
    );

    const statsByCategory = categoryGroups.reduce<Record<string, number>>((acc, curr) => {
      const name = categoryByProductId.get(curr.productId) || "Khác";
      acc[name] = (acc[name] || 0) + curr._count._all;
      return acc;
    }, {});

    const categoryChartData = Object.entries(statsByCategory).map(([name, value]) => ({
      name,
      value,
    }));

    const statusChartData = [
      { name: "Trong kho", value: inStockLooseCount, color: "#22c55e" },
      { name: "Đã giữ", value: reservedCount, color: "#eab308" },
      { name: "Đã lắp trong server", value: installedCount, color: "#6366f1" },
      { name: "Đang dùng", value: deployedCount, color: "#3b82f6" },
      { name: "Đã bàn giao", value: handedOverCount, color: "#7c3aed" },
      { name: "Đang thuê", value: rentedCount, color: "#8b5cf6" },
      { name: "Bảo trì", value: maintenanceCount, color: "#f59e0b" },
      { name: "Hỏng", value: faultyCount, color: "#ef4444" },
      { name: "Thanh lý", value: disposedCount, color: "#64748b" },
    ].filter(d => d.value > 0);

    return NextResponse.json({
      summary: {
        inStock: warehouseStockCount, deployed: deployedCount,
        installed: installedCount,
        installedInWarehouse: installedInWarehouseCount,
        maintenance: maintenanceCount, faulty: faultyCount,
        disposed: disposedCount,
        reserved: reservedCount,
        handedOver: handedOverCount,
        rented: rentedCount,
        total: activeTotalCount
      },
      alerts,
      statsByCategory,
      categoryChartData,
      statusChartData,
      trend7Days,
      expiringRentals
    });
  } catch {
    return NextResponse.json({ error: "Lỗi lấy dữ liệu dashboard" }, { status: 500 });
  }
}
