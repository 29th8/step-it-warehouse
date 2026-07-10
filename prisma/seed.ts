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
  await prisma.productCategory.deleteMany();

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

  const categoryData = [
    { code: "SERVER", name: "Server", isMain: true },
    { code: "NETWORK", name: "Thiết bị mạng", isMain: true },
    { code: "MEMORY", name: "RAM / Bộ nhớ", isMain: false },
    { code: "STORAGE", name: "Lưu trữ", isMain: false },
    { code: "CPU", name: "CPU", isMain: false },
    { code: "ACCESSORY", name: "Phụ kiện", isMain: false },
  ];
  const categoryMap = new Map<string, string>();
  for (const c of categoryData) {
    const category = await prisma.productCategory.create({ data: c });
    categoryMap.set(c.code, category.id);
  }

  // 1. Tạo 10 Sản phẩm (Products)
  const productsData = [
    { name: "Dell PowerEdge R740", modelNumber: "R740-001", category: "SERVER", type: "SERVER", vendor: "Dell", description: "2U Rack Server" },
    { name: "HP ProLiant DL380 Gen10", modelNumber: "DL380-G10", category: "SERVER", type: "SERVER", vendor: "HP", description: "2U Rack Server" },
    { name: "Cisco Catalyst 9300", modelNumber: "C9300-48P", category: "NETWORK", type: "SWITCH", vendor: "Cisco", description: "48-port PoE" },
    { name: "FortiGate 100F", modelNumber: "FG-100F", category: "NETWORK", type: "FIREWALL", vendor: "Fortinet", description: "NGFW" },
    { name: "RAM 32GB DDR4 ECC", modelNumber: "RAM-32G-ECC", category: "MEMORY", type: "RAM", vendor: "Samsung", attributes: { generation: "ECC DDR4", capacity: "32GB", speed: "2933MHz" } },
    { name: "RAM 64GB DDR4 ECC", modelNumber: "RAM-64G-ECC", category: "MEMORY", type: "RAM", vendor: "SK Hynix", attributes: { generation: "ECC DDR4", capacity: "64GB", speed: "3200MHz" } },
    { name: "Intel Xeon Gold 6230", modelNumber: "CPU-XG-6230", category: "CPU", type: "CPU", vendor: "Intel", attributes: { series: "Gold", cores: "20C" } },
    { name: "SSD Samsung 1.92TB Enterprise", modelNumber: "SSD-192-ENT", category: "STORAGE", type: "SSD", vendor: "Samsung", attributes: { type: "SSD", capacity: "1.92TB", interface: "SATA" } },
    { name: "HDD Seagate 8TB SAS", modelNumber: "HDD-8T-SAS", category: "STORAGE", type: "HDD", vendor: "Seagate", attributes: { type: "HDD", capacity: "8TB", interface: "SAS" } },
    { name: "Cáp quang OM4 5m", modelNumber: "CBL-OM4-5M", category: "ACCESSORY", type: "CABLE", vendor: "CommScope", description: "LC-LC 5m" },
  ];

  const products = [];
  for (const p of productsData) {
    const { category, ...product } = p;
    products.push(await prisma.product.create({
      data: {
        ...product,
        attributes: "attributes" in product ? product.attributes || {} : {},
        categoryId: categoryMap.get(category)!,
      }
    }));
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
    data: { parentId: assets[0].id, status: "INSTALLED", rackId: racks[0].id, rackUnit: 1 }
  });
  await prisma.asset.update({
    where: { id: assets[7].id }, // CPU
    data: { parentId: assets[0].id, status: "INSTALLED", rackId: racks[0].id, rackUnit: 1 }
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
