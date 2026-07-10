-- Convert fixed ProductCategory enum into editable ProductCategory table.

ALTER TYPE "ProductCategory" RENAME TO "ProductCategoryEnum_old";

CREATE TABLE "ProductCategory" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isMain" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductCategory_code_key" ON "ProductCategory"("code");
CREATE INDEX "ProductCategory_code_idx" ON "ProductCategory"("code");
CREATE INDEX "ProductCategory_isMain_idx" ON "ProductCategory"("isMain");

INSERT INTO "ProductCategory" ("id", "code", "name", "isMain")
SELECT
  'cat_' || lower(category::text),
  category::text,
  CASE category::text
    WHEN 'SERVER' THEN 'Server'
    WHEN 'NETWORK' THEN 'Thiết bị mạng'
    WHEN 'MEMORY' THEN 'RAM / Bộ nhớ'
    WHEN 'STORAGE' THEN 'Lưu trữ'
    WHEN 'CPU' THEN 'CPU'
    WHEN 'GPU' THEN 'GPU'
    WHEN 'ACCESSORY' THEN 'Phụ kiện'
    ELSE category::text
  END,
  CASE WHEN category::text IN ('SERVER', 'NETWORK') THEN true ELSE false END
FROM (SELECT DISTINCT "category" AS category FROM "Product") c
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "ProductCategory" ("id", "code", "name", "isMain")
VALUES
  ('cat_server', 'SERVER', 'Server', true),
  ('cat_network', 'NETWORK', 'Thiết bị mạng', true),
  ('cat_memory', 'MEMORY', 'RAM / Bộ nhớ', false),
  ('cat_storage', 'STORAGE', 'Lưu trữ', false),
  ('cat_cpu', 'CPU', 'CPU', false),
  ('cat_gpu', 'GPU', 'GPU', false),
  ('cat_accessory', 'ACCESSORY', 'Phụ kiện', false)
ON CONFLICT ("code") DO NOTHING;

ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

UPDATE "Product" p
SET "categoryId" = pc."id"
FROM "ProductCategory" pc
WHERE pc."code" = p."category"::text;

ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "category";

CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE "ProductCategoryEnum_old";

