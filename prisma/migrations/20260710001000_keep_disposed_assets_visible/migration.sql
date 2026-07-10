UPDATE "Asset"
SET "deletedAt" = NULL,
    "deletedById" = NULL
WHERE "status" = 'DISPOSED'::"AssetStatus"
  AND "deletedAt" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "StockMovement"
    WHERE "StockMovement"."assetId" = "Asset"."id"
      AND "StockMovement"."note" LIKE 'Thanh lý%'
  );
