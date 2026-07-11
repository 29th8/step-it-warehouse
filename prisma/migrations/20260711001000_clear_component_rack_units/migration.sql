UPDATE "Asset" a
SET
  "rackUnit" = NULL,
  "previousRackUnit" = NULL
FROM "Product" p
JOIN "ProductCategory" pc ON pc."id" = p."categoryId"
WHERE a."productId" = p."id"
  AND pc."isMain" = false
  AND (a."rackUnit" IS NOT NULL OR a."previousRackUnit" IS NOT NULL);
