ALTER TABLE "Asset"
ADD COLUMN "installSlotType" TEXT,
ADD COLUMN "installSlotName" TEXT;

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
  'attr_' || lower(pc."code") || '_' || attr."key",
  pc."id",
  attr."key",
  attr."label",
  attr."inputType"::"ProductAttributeInputType",
  false,
  attr."sortOrder",
  true,
  NOW(),
  NOW()
FROM "ProductCategory" pc
CROSS JOIN (
  VALUES
    ('dimmSlots', 'Số khe RAM (DIMM)', 'NUMBER', 10),
    ('driveBays', 'Số bay ổ cứng', 'NUMBER', 11),
    ('ramGeneration', 'Chuẩn RAM hỗ trợ', 'TEXT', 12),
    ('ramType', 'Loại RAM hỗ trợ', 'TEXT', 13),
    ('driveFormFactor', 'Kích thước ổ hỗ trợ', 'TEXT', 14),
    ('driveInterface', 'Chuẩn ổ hỗ trợ', 'TEXT', 15)
) AS attr("key", "label", "inputType", "sortOrder")
WHERE pc."code" = 'SERVER'
ON CONFLICT ("categoryId", "key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "inputType" = EXCLUDED."inputType",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = true,
  "updatedAt" = NOW();
