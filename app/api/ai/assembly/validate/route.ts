import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { componentSlotType, validateComponentCompatibility } from "@/lib/server-slots";

const DEFAULT_TIMEOUT_MS = 15_000;

type AssemblyIssue = {
  componentId?: string;
  serialNumber?: string;
  severity: "ERROR" | "WARNING";
  message: string;
  source: "SYSTEM" | "HERMES";
};

function readBaseUrl() {
  return process.env.HERMES_API_URL?.replace(/\/+$/, "");
}

function readTimeout() {
  const value = Number(process.env.HERMES_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function serializeAssetForHermes(asset: any) {
  return {
    id: asset.id,
    serialNumber: asset.serialNumber,
    product: {
      id: asset.product?.id,
      name: asset.product?.name,
      modelNumber: asset.product?.modelNumber,
      vendor: asset.product?.vendor,
      category: asset.product?.productCategory?.code,
      categoryName: asset.product?.productCategory?.name,
      attributes: asset.product?.attributes || {},
    },
  };
}

function serializeProductAsComponent(product: any) {
  return {
    id: `product:${product.id}`,
    serialNumber: product.modelNumber || product.name,
    product: {
      id: product.id,
      name: product.name,
      modelNumber: product.modelNumber,
      vendor: product.vendor,
      category: product.productCategory?.code,
      categoryName: product.productCategory?.name,
      productCategory: product.productCategory,
      attributes: product.attributes || {},
    },
  };
}

function normalizeHermesIssues(payload: unknown): AssemblyIssue[] {
  if (!isPlainObject(payload)) return [];
  const rawIssues = Array.isArray(payload.issues)
    ? payload.issues
    : Array.isArray(payload.warnings)
      ? payload.warnings.map((message) => ({ severity: "WARNING", message }))
      : [];

  return rawIssues
    .map((item): AssemblyIssue | null => {
      if (typeof item === "string") {
        return { severity: "WARNING", message: item, source: "HERMES" };
      }
      if (!isPlainObject(item)) return null;
      const message = readString(item.message);
      if (!message) return null;
      const severity = readString(item.severity).toUpperCase() === "ERROR" ? "ERROR" : "WARNING";
      return {
        componentId: readString(item.componentId) || undefined,
        serialNumber: readString(item.serialNumber) || undefined,
        severity,
        message,
        source: "HERMES",
      };
    })
    .filter((item): item is AssemblyIssue => Boolean(item));
}

function readHermesCompatible(payload: unknown, issues: AssemblyIssue[]) {
  if (!isPlainObject(payload)) return issues.every((issue) => issue.severity !== "ERROR");
  if (typeof payload.compatible === "boolean") return payload.compatible;
  if (typeof payload.isCompatible === "boolean") return payload.isCompatible;
  return issues.every((issue) => issue.severity !== "ERROR");
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const parentId = readString(body.parentId);
    const componentIds = Array.isArray(body.componentIds)
      ? body.componentIds.map(readString).filter(Boolean)
      : [];
    const componentProductIds = Array.isArray(body.componentProductIds)
      ? body.componentProductIds.map(readString).filter(Boolean)
      : [];

    if (!parentId || (componentIds.length === 0 && componentProductIds.length === 0)) {
      return NextResponse.json({ error: "Thiếu server hoặc danh sách linh kiện cần kiểm tra." }, { status: 400 });
    }

    const [parentAsset, components, componentProducts] = await Promise.all([
      prisma.asset.findUnique({
        where: { id: parentId },
        include: { product: { include: { productCategory: true } } },
      }),
      prisma.asset.findMany({
        where: { id: { in: componentIds } },
        include: { product: { include: { productCategory: true } } },
      }),
      prisma.product.findMany({
        where: { id: { in: componentProductIds } },
        include: { productCategory: true },
      }),
    ]);

    if (!parentAsset) {
      return NextResponse.json({ error: "Không tìm thấy server cần lắp ráp." }, { status: 404 });
    }

    const productComponents = componentProducts.map(serializeProductAsComponent);
    const componentsToValidate: any[] = [...components, ...productComponents];
    if (componentsToValidate.length === 0) {
      return NextResponse.json({ compatible: true, issues: [], skipped: true });
    }

    const slotComponents = componentsToValidate.filter((asset) => componentSlotType({
      product: {
        category: asset.product.productCategory?.code,
        attributes: asset.product.attributes,
      },
    }));

    const systemIssues = slotComponents.reduce<AssemblyIssue[]>((acc, component) => {
        const message = validateComponentCompatibility(
          {
            category: parentAsset.product.productCategory?.code,
            attributes: parentAsset.product.attributes,
          },
          {
            category: component.product.productCategory?.code,
            attributes: component.product.attributes,
          },
        );
        if (!message) return acc;
        acc.push({
          componentId: component.id,
          serialNumber: component.serialNumber,
          severity: "ERROR" as const,
          message,
          source: "SYSTEM" as const,
        });
        return acc;
      }, []);

    const baseUrl = readBaseUrl();
    if (!baseUrl) {
      return NextResponse.json({
        compatible: systemIssues.length === 0,
        issues: systemIssues,
        aiUnavailable: true,
        aiMessage: "Chưa cấu hình HERMES_API_URL cho Hermes Agent.",
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), readTimeout());

    let hermesPayload: unknown = {};
    try {
      const response = await fetch(`${baseUrl}/assembly/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.HERMES_API_TOKEN
            ? { Authorization: `Bearer ${process.env.HERMES_API_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          validationPolicy: {
            mode: "STRICT",
            rules: [
              "Only allow assembly when the component category is explicitly compatible with the parent main device.",
              "For SERVER, MEMORY and STORAGE must match declared RAM/drive attributes.",
              "For MODULE/PSU/FAN/GPU/NETWORK/ACCESSORY, require explicit parent support attributes such as supportedComponentCategories, supportedModules, moduleType, moduleInterface, psuType, fanType, gpuSupport, or networkModuleSupport.",
              "If compatibility cannot be proven from the provided attributes, return compatible=false with an ERROR issue.",
              "Never silently accept unknown component categories.",
            ],
          },
          server: serializeAssetForHermes(parentAsset),
          components: componentsToValidate.map(serializeAssetForHermes),
        }),
        signal: controller.signal,
      });

      hermesPayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return NextResponse.json({
          compatible: systemIssues.length === 0,
          issues: systemIssues,
          aiUnavailable: true,
          aiMessage: isPlainObject(hermesPayload) && typeof hermesPayload.message === "string"
            ? hermesPayload.message
            : "Hermes Agent trả về lỗi khi kiểm tra tương thích.",
        });
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError";
      return NextResponse.json({
        compatible: systemIssues.length === 0,
        issues: systemIssues,
        aiUnavailable: true,
        aiMessage: isTimeout ? "Hermes Agent phản hồi quá lâu." : "Không thể kết nối Hermes Agent.",
      });
    } finally {
      clearTimeout(timeout);
    }

    const hermesIssues = normalizeHermesIssues(hermesPayload);
    const issues = [...systemIssues, ...hermesIssues];

    return NextResponse.json({
      compatible: systemIssues.length === 0 && readHermesCompatible(hermesPayload, hermesIssues),
      confidence: isPlainObject(hermesPayload) && typeof hermesPayload.confidence === "number" ? hermesPayload.confidence : undefined,
      issues,
    });
  } catch (error) {
    console.error("Hermes assembly validation error:", error);
    return NextResponse.json({ error: "Lỗi kiểm tra tương thích lắp ráp bằng AI." }, { status: 500 });
  }
}
