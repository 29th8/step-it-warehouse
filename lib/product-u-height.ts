type ProductWithAttributes = {
  attributes?: unknown;
};

function getAttributeValue(attributes: unknown, key: string): unknown {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return undefined;
  return (attributes as Record<string, unknown>)[key];
}

export function getProductRackUnitHeight(product: ProductWithAttributes | null | undefined, fallback = 1): number {
  const rawValue =
    getAttributeValue(product?.attributes, "uHeight") ??
    getAttributeValue(product?.attributes, "rackUnitHeight") ??
    getAttributeValue(product?.attributes, "heightU");

  const parsed = Number.parseInt(String(rawValue ?? fallback), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
