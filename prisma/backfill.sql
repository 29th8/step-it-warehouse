UPDATE "Product" SET brand = 'UNKNOWN' WHERE brand IS NULL;
UPDATE "Product" SET specification = 'GENERAL' WHERE specification IS NULL;
UPDATE "Product" SET type = 'GENERAL' WHERE type NOT IN ('SERVER', 'SWITCH', 'FIREWALL', 'RAM', 'SSD', 'HDD', 'NVME', 'CPU', 'GPU', 'NIC', 'PSU', 'CABLE', 'ACCESSORY');
