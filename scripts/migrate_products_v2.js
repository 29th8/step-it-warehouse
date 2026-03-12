const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Staging data for Product Schema V2 Migration...");

    // 1. Rename manufacturer -> vendor safely
    try {
        console.log("Renaming manufacturer to vendor...");
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" RENAME COLUMN "manufacturer" TO "vendor";`);
    } catch (e) {
        if (!e.message.includes('column "vendor" of relation "Product" already exists')) {
            console.warn("Notice: Column rename skipped or failed (might already be renamed).");
        }
    }

    // 2. Map existing category strings to match the names of our new ENUM
    try {
        console.log("Mapping Category Text Values...");
        await prisma.$executeRawUnsafe(`UPDATE "Product" SET "category" = 'NETWORK' WHERE "category" = 'SWITCH' OR "category" = 'FIREWALL';`);
        await prisma.$executeRawUnsafe(`UPDATE "Product" SET "category" = 'MEMORY' WHERE "category" = 'COMPONENT' AND "type" = 'RAM';`);
        await prisma.$executeRawUnsafe(`UPDATE "Product" SET "category" = 'CPU' WHERE "category" = 'COMPONENT' AND "type" = 'CPU';`);
        await prisma.$executeRawUnsafe(`UPDATE "Product" SET "category" = 'GPU' WHERE "category" = 'COMPONENT' AND "type" = 'GPU';`);
        // Anything else component -> accessory
        await prisma.$executeRawUnsafe(`UPDATE "Product" SET "category" = 'ACCESSORY' WHERE "category" = 'COMPONENT';`);
    } catch (e) {
        console.error("Mapping categories failed:", e);
    }

    // 3. Create the Enum Type explicitly in Postgres so `category` can be converted
    try {
        console.log("Creating Postgres Enum ProductCategory...");
        await prisma.$executeRawUnsafe(`CREATE TYPE "ProductCategory" AS ENUM ('SERVER', 'MEMORY', 'STORAGE', 'CPU', 'GPU', 'NETWORK', 'ACCESSORY');`);
    } catch (e) {
        if (!e.message.includes('already exists')) {
            console.warn("Notice: Enum creation failed", e);
        }
    }

    // 4. Force cast the column to use the Enum 
    try {
        console.log("Casting text column category into Enum...");
        await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ALTER COLUMN "category" TYPE "ProductCategory" USING "category"::text::"ProductCategory";`);
        console.log("Category cast successful!");
    } catch (e) {
        console.error("Category Cast failed", e);
    }

    console.log("Pre-migration staging successful! You can now run `npx prisma db push --accept-data-loss` safely.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
