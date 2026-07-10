ALTER TABLE "Asset"
ADD COLUMN "previousStatus" "AssetStatus",
ADD COLUMN "previousParentId" TEXT,
ADD COLUMN "previousWarehouseId" TEXT,
ADD COLUMN "previousRackId" TEXT,
ADD COLUMN "previousRackUnit" INTEGER;
