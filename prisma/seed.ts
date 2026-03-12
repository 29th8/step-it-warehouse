import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Bắt đầu dọn dẹp dữ liệu cũ...");
  await prisma.stockMovement.deleteMany();
  await prisma.user.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.rack.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.product.deleteMany();

  console.log("Bắt đầu chèn dữ liệu mới...");

  // 0. Tạo 1 Admin User
  const adminUser = await prisma.user.create({
    data: {
      username: "admin_seed",
      passwordHash: "dummy_hash_for_seed", // Usually hashed, this is just for seed script satisfaction
      name: "Admin User",
      role: "ADMIN"
    }
  });

  // 1. Tạo 10 Sản phẩm (Products)
  const productsData = [
    { name: "Dell PowerEdge R740", modelNumber: "R740-001", category: "SERVER", type: "SERVER", brand: "Dell", specification: "2U Rack Server", manufacturer: "Dell" },
    { name: "HP ProLiant DL380 Gen10", modelNumber: "DL380-G10", category: "SERVER", type: "SERVER", brand: "HP", specification: "2U Rack Server", manufacturer: "HP" },
    { name: "Cisco Catalyst 9300", modelNumber: "C9300-48P", category: "SWITCH", type: "SWITCH", brand: "Cisco", specification: "48-port PoE", manufacturer: "Cisco" },
    { name: "FortiGate 100F", modelNumber: "FG-100F", category: "FIREWALL", type: "FIREWALL", brand: "Fortinet", specification: "NGFW", manufacturer: "Fortinet" },
    { name: "RAM 32GB DDR4 ECC", modelNumber: "RAM-32G-ECC", category: "COMPONENT", type: "RAM", brand: "Samsung", specification: "32GB DDR4 2933Mhz", manufacturer: "Samsung" },
    { name: "RAM 64GB DDR4 ECC", modelNumber: "RAM-64G-ECC", category: "COMPONENT", type: "RAM", brand: "SK Hynix", specification: "64GB DDR4 3200Mhz", manufacturer: "SK Hynix" },
    { name: "Intel Xeon Gold 6230", modelNumber: "CPU-XG-6230", category: "COMPONENT", type: "CPU", brand: "Intel", specification: "20-Core 2.1GHz", manufacturer: "Intel" },
    { name: "SSD Samsung 1.92TB Enterprise", modelNumber: "SSD-192-ENT", category: "STORAGE", type: "SSD", brand: "Samsung", specification: "1.92TB SATA", manufacturer: "Samsung" },
    { name: "HDD Seagate 8TB SAS", modelNumber: "HDD-8T-SAS", category: "STORAGE", type: "HDD", brand: "Seagate", specification: "8TB 7200RPM", manufacturer: "Seagate" },
    { name: "Cáp quang OM4 5m", modelNumber: "CBL-OM4-5M", category: "ACCESSORY", type: "CABLE", brand: "CommScope", specification: "LC-LC 5m", manufacturer: "CommScope" },
  ];

  const products = [];
  for (const p of productsData as any[]) {
    products.push(await prisma.product.create({ data: p }));
  }

  // 2. Tạo 10 Kho hàng (Warehouses)
  const warehouses = [];
  for (let i = 1; i <= 10; i++) {
    warehouses.push(
      await prisma.warehouse.create({
        data: { name: `Kho Datacenter 0${i}`, location: `Khu vực tầng ${i}` },
      })
    );
  }

  // 3. Tạo 10 Tủ Rack (Racks) - Gắn vào các Kho đầu tiên
  const racks = [];
  for (let i = 1; i <= 10; i++) {
    racks.push(
      await prisma.rack.create({
        data: {
          name: `Rack A${i.toString().padStart(2, "0")}`,
          totalUnits: 42,
          warehouseId: warehouses[i % 3].id, // Phân bổ vào 3 kho đầu tiên
        },
      })
    );
  }

  // 4. Tạo 10 Thiết bị cụ thể (Assets) - Gắn vào Products, Warehouses và Racks
  const assets = [];
  for (let i = 0; i < 10; i++) {
    // 5 thiết bị đầu là Server/Switch có vị trí U, 5 thiết bị sau là linh kiện chờ trên kệ
    const isRackMounted = i < 5;

    assets.push(
      await prisma.asset.create({
        data: {
          serialNumber: `SN-2026-IT-${i.toString().padStart(4, "0")}`,
          status: isRackMounted ? "DEPLOYED" : "IN_STOCK",
          productId: products[i].id,
          warehouseId: warehouses[0].id,
          rackId: isRackMounted ? racks[0].id : null,
          rackUnit: isRackMounted ? (i * 2) + 1 : null, // Mỗi thiết bị cách nhau 2U
        },
      })
    );
  }

  // 5. Lắp ráp thử 1 CPU và 1 RAM vào Server đầu tiên (Demo Self-Relation)
  await prisma.asset.update({
    where: { id: assets[6].id }, // RAM
    data: { parentId: assets[0].id, status: "DEPLOYED", rackId: racks[0].id, rackUnit: 1 }
  });
  await prisma.asset.update({
    where: { id: assets[7].id }, // CPU
    data: { parentId: assets[0].id, status: "DEPLOYED", rackId: racks[0].id, rackUnit: 1 }
  });

  // 6. Tạo 10 Biến động kho (Stock Movements)
  for (let i = 0; i < 10; i++) {
    await prisma.stockMovement.create({
      data: {
        assetId: assets[i].id,
        type: "IMPORT",
        note: `Nhập kho lô hàng đầu năm (Mục ${i + 1})`,
        userId: adminUser.id,   // Replaced performedBy with userId
      },
    });
  }

  console.log("✅ Đã chèn thành công toàn bộ dữ liệu mẫu!");
}

main()
  .catch((e) => {
    console.error("Lỗi khi chèn dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });