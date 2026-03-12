const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting backfill...");
    try {
        await prisma.$executeRawUnsafe(`UPDATE "Product" SET brand = 'UNKNOWN' WHERE brand IS NULL;`);
        await prisma.$executeRawUnsafe(`UPDATE "Product" SET specification = 'GENERAL' WHERE specification IS NULL;`);
        await prisma.$executeRawUnsafe(`UPDATE "Product" SET type = 'GENERAL' WHERE type NOT IN ('SERVER', 'SWITCH', 'FIREWALL', 'RAM', 'SSD', 'HDD', 'NVME', 'CPU', 'GPU', 'NIC', 'PSU', 'CABLE', 'ACCESSORY');`);
        console.log("Backfill successful.");
    } catch (error) {
        console.error("Backfill failed:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
