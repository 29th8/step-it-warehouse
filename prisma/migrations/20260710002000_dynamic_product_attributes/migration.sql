CREATE TYPE "ProductAttributeInputType" AS ENUM ('TEXT', 'SELECT', 'NUMBER', 'BOOLEAN');

CREATE TABLE "ProductAttributeDefinition" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "inputType" "ProductAttributeInputType" NOT NULL DEFAULT 'TEXT',
  "required" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductAttributeDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductAttributeOption" (
  "id" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "label" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductAttributeOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductAttributeDefinition_categoryId_key_key" ON "ProductAttributeDefinition"("categoryId", "key");
CREATE INDEX "ProductAttributeDefinition_categoryId_idx" ON "ProductAttributeDefinition"("categoryId");
CREATE INDEX "ProductAttributeDefinition_key_idx" ON "ProductAttributeDefinition"("key");
CREATE INDEX "ProductAttributeDefinition_isActive_idx" ON "ProductAttributeDefinition"("isActive");

CREATE UNIQUE INDEX "ProductAttributeOption_definitionId_value_key" ON "ProductAttributeOption"("definitionId", "value");
CREATE INDEX "ProductAttributeOption_definitionId_idx" ON "ProductAttributeOption"("definitionId");
CREATE INDEX "ProductAttributeOption_isActive_idx" ON "ProductAttributeOption"("isActive");

ALTER TABLE "ProductAttributeDefinition"
  ADD CONSTRAINT "ProductAttributeDefinition_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductAttributeOption"
  ADD CONSTRAINT "ProductAttributeOption_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "ProductAttributeDefinition"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ProductCategory" ("id", "code", "name", "isMain")
VALUES
  ('cat_module', 'MODULE', 'Module quang / Module mạng', false),
  ('cat_power', 'POWER', 'Nguồn', false),
  ('cat_fan', 'FAN', 'Quạt', false)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "ProductAttributeDefinition" ("id", "categoryId", "key", "label", "inputType", "required", "sortOrder")
SELECT defs."id", pc."id", defs."key", defs."label", defs."inputType"::"ProductAttributeInputType", defs."required", defs."sortOrder"
FROM (
  VALUES
    ('attr_memory_generation', 'MEMORY', 'generation', 'Thế hệ RAM', 'SELECT', true, 10),
    ('attr_memory_capacity', 'MEMORY', 'capacity', 'Dung lượng', 'SELECT', true, 20),
    ('attr_memory_speed', 'MEMORY', 'speed', 'Tốc độ', 'TEXT', false, 30),
    ('attr_storage_type', 'STORAGE', 'type', 'Loại ổ', 'SELECT', true, 10),
    ('attr_storage_capacity', 'STORAGE', 'capacity', 'Dung lượng', 'SELECT', true, 20),
    ('attr_storage_interface', 'STORAGE', 'interface', 'Giao tiếp', 'SELECT', false, 30),
    ('attr_storage_form_factor', 'STORAGE', 'formFactor', 'Form factor', 'SELECT', false, 40),
    ('attr_cpu_series', 'CPU', 'series', 'Dòng CPU', 'SELECT', false, 10),
    ('attr_cpu_cores', 'CPU', 'cores', 'Cores / Threads', 'TEXT', false, 20),
    ('attr_module_type', 'MODULE', 'moduleType', 'Loại module', 'SELECT', true, 10),
    ('attr_module_speed', 'MODULE', 'speed', 'Tốc độ', 'SELECT', false, 20),
    ('attr_module_wavelength', 'MODULE', 'wavelength', 'Bước sóng', 'SELECT', false, 30),
    ('attr_power_wattage', 'POWER', 'wattage', 'Công suất', 'SELECT', true, 10),
    ('attr_power_efficiency', 'POWER', 'efficiency', 'Hiệu suất', 'SELECT', false, 20),
    ('attr_fan_size', 'FAN', 'size', 'Kích thước', 'SELECT', true, 10),
    ('attr_fan_airflow', 'FAN', 'airflow', 'Lưu lượng gió', 'TEXT', false, 20)
) AS defs("id", "categoryCode", "key", "label", "inputType", "required", "sortOrder")
JOIN "ProductCategory" pc ON pc."code" = defs."categoryCode"
ON CONFLICT ("categoryId", "key") DO NOTHING;

INSERT INTO "ProductAttributeOption" ("id", "definitionId", "value", "label", "sortOrder")
VALUES
  ('opt_memory_generation_ddr3', 'attr_memory_generation', 'ECC DDR3', 'ECC DDR3', 10),
  ('opt_memory_generation_ddr4', 'attr_memory_generation', 'ECC DDR4', 'ECC DDR4', 20),
  ('opt_memory_generation_ddr5', 'attr_memory_generation', 'ECC DDR5', 'ECC DDR5', 30),
  ('opt_memory_capacity_8gb', 'attr_memory_capacity', '8GB', '8GB', 10),
  ('opt_memory_capacity_16gb', 'attr_memory_capacity', '16GB', '16GB', 20),
  ('opt_memory_capacity_32gb', 'attr_memory_capacity', '32GB', '32GB', 30),
  ('opt_memory_capacity_64gb', 'attr_memory_capacity', '64GB', '64GB', 40),
  ('opt_memory_capacity_128gb', 'attr_memory_capacity', '128GB', '128GB', 50),
  ('opt_storage_type_ssd', 'attr_storage_type', 'SSD', 'SSD', 10),
  ('opt_storage_type_hdd', 'attr_storage_type', 'HDD', 'HDD', 20),
  ('opt_storage_capacity_200gb', 'attr_storage_capacity', '200GB', '200GB', 10),
  ('opt_storage_capacity_480gb', 'attr_storage_capacity', '480GB', '480GB', 20),
  ('opt_storage_capacity_960gb', 'attr_storage_capacity', '960GB', '960GB', 30),
  ('opt_storage_capacity_192tb', 'attr_storage_capacity', '1.92TB', '1.92TB', 40),
  ('opt_storage_capacity_384tb', 'attr_storage_capacity', '3.84TB', '3.84TB', 50),
  ('opt_storage_capacity_768tb', 'attr_storage_capacity', '7.68TB', '7.68TB', 60),
  ('opt_storage_capacity_1536tb', 'attr_storage_capacity', '15.36TB', '15.36TB', 70),
  ('opt_storage_interface_sata', 'attr_storage_interface', 'SATA', 'SATA', 10),
  ('opt_storage_interface_nvme', 'attr_storage_interface', 'NVME', 'NVME', 20),
  ('opt_storage_interface_sas', 'attr_storage_interface', 'SAS', 'SAS', 30),
  ('opt_storage_interface_pcie', 'attr_storage_interface', 'PCIe', 'PCIe', 40),
  ('opt_storage_form_m2', 'attr_storage_form_factor', 'M.2', 'M.2', 10),
  ('opt_storage_form_25', 'attr_storage_form_factor', '2.5"', '2.5"', 20),
  ('opt_storage_form_35', 'attr_storage_form_factor', '3.5"', '3.5"', 30),
  ('opt_storage_form_u2', 'attr_storage_form_factor', 'U.2', 'U.2', 40),
  ('opt_cpu_series_bronze', 'attr_cpu_series', 'Bronze', 'Bronze', 10),
  ('opt_cpu_series_silver', 'attr_cpu_series', 'Silver', 'Silver', 20),
  ('opt_cpu_series_gold', 'attr_cpu_series', 'Gold', 'Gold', 30),
  ('opt_cpu_series_platinum', 'attr_cpu_series', 'Platinum', 'Platinum', 40),
  ('opt_cpu_series_epyc', 'attr_cpu_series', 'Epyc', 'Epyc', 50),
  ('opt_module_type_sfp', 'attr_module_type', 'SFP', 'SFP', 10),
  ('opt_module_type_sfp_plus', 'attr_module_type', 'SFP+', 'SFP+', 20),
  ('opt_module_type_qsfp', 'attr_module_type', 'QSFP', 'QSFP', 30),
  ('opt_module_speed_1g', 'attr_module_speed', '1G', '1G', 10),
  ('opt_module_speed_10g', 'attr_module_speed', '10G', '10G', 20),
  ('opt_module_speed_25g', 'attr_module_speed', '25G', '25G', 30),
  ('opt_module_speed_40g', 'attr_module_speed', '40G', '40G', 40),
  ('opt_module_speed_100g', 'attr_module_speed', '100G', '100G', 50),
  ('opt_module_wavelength_850', 'attr_module_wavelength', '850nm', '850nm', 10),
  ('opt_module_wavelength_1310', 'attr_module_wavelength', '1310nm', '1310nm', 20),
  ('opt_module_wavelength_1550', 'attr_module_wavelength', '1550nm', '1550nm', 30),
  ('opt_power_wattage_550', 'attr_power_wattage', '550W', '550W', 10),
  ('opt_power_wattage_750', 'attr_power_wattage', '750W', '750W', 20),
  ('opt_power_wattage_1200', 'attr_power_wattage', '1200W', '1200W', 30),
  ('opt_power_efficiency_gold', 'attr_power_efficiency', 'Gold', 'Gold', 10),
  ('opt_power_efficiency_platinum', 'attr_power_efficiency', 'Platinum', 'Platinum', 20),
  ('opt_power_efficiency_titanium', 'attr_power_efficiency', 'Titanium', 'Titanium', 30),
  ('opt_fan_size_40', 'attr_fan_size', '40mm', '40mm', 10),
  ('opt_fan_size_80', 'attr_fan_size', '80mm', '80mm', 20),
  ('opt_fan_size_120', 'attr_fan_size', '120mm', '120mm', 30)
ON CONFLICT ("definitionId", "value") DO NOTHING;
