INSERT INTO "ProductAttributeDefinition" (
  "id",
  "categoryId",
  "key",
  "label",
  "inputType",
  "required",
  "sortOrder",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'attr_' || lower(pc."code") || '_u_height',
  pc."id",
  'uHeight',
  'Chiều cao rack (U)',
  'NUMBER'::"ProductAttributeInputType",
  false,
  5,
  true,
  NOW(),
  NOW()
FROM "ProductCategory" pc
WHERE pc."isMain" = true
ON CONFLICT ("categoryId", "key") DO NOTHING;
