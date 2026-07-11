UPDATE "ProductAttributeDefinition" pad
SET
  "isActive" = false,
  "updatedAt" = NOW()
FROM "ProductCategory" pc
WHERE pad."categoryId" = pc."id"
  AND pc."isMain" = false
  AND pad."key" = 'uHeight'
  AND pad."isActive" = true;

UPDATE "Product" p
SET "attributes" = p."attributes" - 'uHeight'
FROM "ProductCategory" pc
WHERE p."categoryId" = pc."id"
  AND pc."isMain" = false
  AND p."attributes" ? 'uHeight';
