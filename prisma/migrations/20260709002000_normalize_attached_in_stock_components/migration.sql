UPDATE "Asset"
SET "status" = 'INSTALLED'::"AssetStatus"
WHERE "parentId" IS NOT NULL
  AND "status" = 'IN_STOCK'::"AssetStatus";
