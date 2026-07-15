export type SlotType = "DIMM" | "DRIVE_BAY";

type ProductLike = {
  category?: string;
  productCategory?: { code?: string | null } | null;
  attributes?: unknown;
};

type AssetLike = {
  product?: ProductLike | null;
};

function readAttributes(product?: ProductLike | null) {
  if (!product?.attributes || typeof product.attributes !== "object" || Array.isArray(product.attributes)) return {};
  return product.attributes as Record<string, unknown>;
}

function readText(attributes: Record<string, unknown>, key: string) {
  const value = attributes[key];
  return value === undefined || value === null ? "" : String(value).trim();
}

function readPositiveInt(attributes: Record<string, unknown>, key: string) {
  const value = Number.parseInt(readText(attributes, key), 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function isServerProduct(product?: ProductLike | null) {
  return (product?.category || product?.productCategory?.code || "").toUpperCase() === "SERVER";
}

export function componentSlotType(asset: AssetLike): SlotType | null {
  const code = (asset.product?.category || asset.product?.productCategory?.code || "").toUpperCase();
  if (code === "MEMORY") return "DIMM";
  if (code === "STORAGE") return "DRIVE_BAY";
  return null;
}

export function getSlotNames(product?: ProductLike | null, slotType?: SlotType | null) {
  const attributes = readAttributes(product);
  if (slotType === "DIMM") {
    const count = readPositiveInt(attributes, "dimmSlots");
    return Array.from({ length: count }, (_, index) => `DIMM ${index + 1}`);
  }
  if (slotType === "DRIVE_BAY") {
    const count = readPositiveInt(attributes, "driveBays");
    return Array.from({ length: count }, (_, index) => `Bay ${index + 1}`);
  }
  return [];
}

function includesValue(allowed: string, actual: string) {
  if (!allowed || !actual) return true;
  const allowedValues = allowed
    .split(/[,\n/|]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (allowedValues.length === 0) return true;
  return allowedValues.includes(actual.trim().toLowerCase());
}

export function validateComponentCompatibility(parentProduct: ProductLike, componentProduct: ProductLike) {
  const slotType = componentSlotType({ product: componentProduct });
  if (!slotType) return null;

  if (!isServerProduct(parentProduct)) {
    return "RAM và ổ cứng chỉ được lắp vào Server.";
  }

  const parentAttrs = readAttributes(parentProduct);
  const componentAttrs = readAttributes(componentProduct);

  if (slotType === "DIMM") {
    const generation = readText(componentAttrs, "generation");
    const type = readText(componentAttrs, "type");
    if (!includesValue(readText(parentAttrs, "ramGeneration"), generation)) {
      return `RAM chuẩn ${generation} không tương thích với server này.`;
    }
    if (!includesValue(readText(parentAttrs, "ramType"), type)) {
      return `RAM loại ${type} không tương thích với server này.`;
    }
  }

  if (slotType === "DRIVE_BAY") {
    const formFactor = readText(componentAttrs, "formFactor") || readText(componentAttrs, "size");
    const storageInterface = readText(componentAttrs, "interface");
    if (!includesValue(readText(parentAttrs, "driveFormFactor"), formFactor)) {
      return `Ổ cứng kích thước ${formFactor} không tương thích với server này.`;
    }
    if (!includesValue(readText(parentAttrs, "driveInterface"), storageInterface)) {
      return `Ổ cứng chuẩn ${storageInterface} không tương thích với server này.`;
    }
  }

  return null;
}
