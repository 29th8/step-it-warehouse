import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeHermesServerSpecResponse,
  readHermesConfidence,
  readHermesErrorMessage,
  readHermesSuccess,
  readHermesWarnings,
} from "@/lib/hermes-server-specs";

const DEFAULT_TIMEOUT_MS = 15_000;

function readTimeout() {
  const value = Number(process.env.HERMES_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

function readBaseUrl() {
  return process.env.HERMES_API_URL?.replace(/\/+$/, "");
}

function readStringField(body: Record<string, unknown>, key: string) {
  return typeof body[key] === "string" ? body[key].trim() : "";
}

function buildPayload(body: Record<string, unknown>) {
  return {
    name: readStringField(body, "name"),
    modelNumber: readStringField(body, "modelNumber"),
    model: readStringField(body, "modelNumber"),
    serialNumber: readStringField(body, "serialNumber"),
    manufacturer: readStringField(body, "vendor"),
    vendor: readStringField(body, "vendor"),
    categoryCode: "SERVER",
  };
}

export async function POST(request: Request) {
  try {
    const baseUrl = readBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { error: "Chưa cấu hình HERMES_API_URL cho Hermes Agent." },
        { status: 500 },
      );
    }

    const body = await request.json() as Record<string, unknown>;
    if (body.category !== "SERVER") {
      return NextResponse.json(
        { error: "AI chỉ hỗ trợ điền thông tin cho danh mục SERVER." },
        { status: 400 },
      );
    }

    if (!String(body.name || "").trim() && !String(body.modelNumber || "").trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên sản phẩm hoặc model trước khi dùng AI." },
        { status: 400 },
      );
    }

    const serverCategory = await prisma.productCategory.findFirst({
      where: { code: "SERVER" },
      select: {
        id: true,
        attributeDefinitions: {
          where: { isActive: true },
          select: { key: true, inputType: true, isActive: true },
        },
      },
    });

    if (!serverCategory) {
      return NextResponse.json(
        { error: "Không tìm thấy danh mục SERVER trong hệ thống." },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), readTimeout());

    let hermesPayload: unknown;
    try {
      const response = await fetch(`${baseUrl}/server-specs/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.HERMES_API_TOKEN
            ? { Authorization: `Bearer ${process.env.HERMES_API_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(buildPayload(body)),
        signal: controller.signal,
      });

      hermesPayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        return NextResponse.json(
          { error: readHermesErrorMessage(hermesPayload) || "Hermes Agent trả về lỗi." },
          { status: response.status },
        );
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError";
      return NextResponse.json(
        { error: isTimeout ? "Hermes Agent phản hồi quá lâu." : "Không thể kết nối Hermes Agent." },
        { status: 504 },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!readHermesSuccess(hermesPayload)) {
      return NextResponse.json(
        { error: readHermesErrorMessage(hermesPayload) || "Hermes không tìm thấy thông tin phù hợp." },
        { status: 422 },
      );
    }

    const { suggestion, ignoredFields } = normalizeHermesServerSpecResponse(
      hermesPayload,
      serverCategory.attributeDefinitions,
    );

    const hasSuggestion =
      Boolean(suggestion.name || suggestion.modelNumber || suggestion.vendor || suggestion.type || suggestion.description) ||
      Object.keys(suggestion.attributes).length > 0;

    if (!hasSuggestion) {
      return NextResponse.json(
        { error: "Hermes không trả về field hợp lệ để áp dụng." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      confidence: readHermesConfidence(hermesPayload),
      suggestions: suggestion,
      warnings: readHermesWarnings(hermesPayload),
      ignoredFields,
    });
  } catch (error) {
    console.error("Hermes server specs suggestion error:", error);
    return NextResponse.json({ error: "Lỗi xử lý gợi ý từ Hermes Agent." }, { status: 500 });
  }
}
