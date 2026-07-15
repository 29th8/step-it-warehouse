"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ProductAttributeDefinition } from "@/components/products/product-attribute-fields";

type ProductFormData = {
  name: string;
  modelNumber: string;
  category: string;
  type: string;
  vendor: string;
  description: string;
  attributes: Record<string, unknown>;
};

type ServerSpecSuggestion = Partial<Omit<ProductFormData, "category" | "attributes">> & {
  attributes?: Record<string, string | number | boolean>;
};

type SuggestionResponse = {
  success: boolean;
  confidence?: number;
  suggestions: ServerSpecSuggestion;
  warnings?: string[];
  ignoredFields?: string[];
};

type SuggestionItem = {
  id: string;
  label: string;
  value: string | number | boolean;
  apply: (formData: ProductFormData) => ProductFormData;
};

type ServerSpecAiButtonProps = {
  formData: ProductFormData;
  setFormData: (formData: ProductFormData) => void;
  attributeDefinitions: ProductAttributeDefinition[];
  disabled?: boolean;
};

const STATIC_LABELS: Record<string, string> = {
  name: "Tên sản phẩm",
  modelNumber: "Model Number",
  vendor: "Vendor / Hãng sản xuất",
  type: "Phân loại phụ",
  description: "Mô tả cấu hình",
};

function formatValue(value: string | number | boolean) {
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return String(value);
}

function readSuggestedIds(
  suggestions: ServerSpecSuggestion,
  attributeDefinitions: ProductAttributeDefinition[],
) {
  const ids: string[] = [];

  for (const key of ["name", "modelNumber", "vendor", "type", "description"] as const) {
    const value = suggestions[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") ids.push(key);
  }

  for (const definition of attributeDefinitions.filter((definition) => definition.isActive)) {
    const value = suggestions.attributes?.[definition.key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      ids.push(`attributes.${definition.key}`);
    }
  }

  return ids;
}

export function ServerSpecAiButton({
  formData,
  setFormData,
  attributeDefinitions,
  disabled,
}: ServerSpecAiButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [response, setResponse] = useState<SuggestionResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isServer = formData.category === "SERVER";

  const suggestionItems = useMemo<SuggestionItem[]>(() => {
    if (!response?.suggestions) return [];

    const items: SuggestionItem[] = [];
    const suggestions = response.suggestions;

    for (const key of ["name", "modelNumber", "vendor", "type", "description"] as const) {
      const value = suggestions[key];
      if (value === undefined || value === null || String(value).trim() === "") continue;
      items.push({
        id: key,
        label: STATIC_LABELS[key],
        value,
        apply: (current) => ({ ...current, [key]: value }),
      });
    }

    for (const definition of attributeDefinitions.filter((definition) => definition.isActive)) {
      const value = suggestions.attributes?.[definition.key];
      if (value === undefined || value === null || String(value).trim() === "") continue;
      items.push({
        id: `attributes.${definition.key}`,
        label: definition.label,
        value,
        apply: (current) => ({
          ...current,
          attributes: {
            ...current.attributes,
            [definition.key]: value,
          },
        }),
      });
    }

    return items;
  }, [attributeDefinitions, response]);

  if (!isServer) return null;

  const fetchSuggestion = async () => {
    if (!formData.name.trim() && !formData.modelNumber.trim()) {
      toast.error("Nhập tên sản phẩm hoặc model trước khi dùng AI");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/server-specs/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          modelNumber: formData.modelNumber,
          vendor: formData.vendor,
          category: formData.category,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Không lấy được gợi ý từ Hermes");

      setResponse(data);
      setSelectedIds(new Set(readSuggestedIds(data.suggestions || {}, attributeDefinitions)));
      setIsReviewOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi gọi Hermes Agent");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleField = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const applySelected = () => {
    if (selectedIds.size === 0) {
      toast.error("Chọn ít nhất một thông tin để áp dụng");
      return;
    }

    const nextFormData = suggestionItems
      .filter((item) => selectedIds.has(item.id))
      .reduce((current, item) => item.apply(current), formData);

    setFormData(nextFormData);
    setIsReviewOpen(false);
    toast.success("Đã áp dụng gợi ý AI vào form");
  };

  return (
    <>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={fetchSuggestion}
          disabled={disabled || isLoading}
          className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          AI điền thông tin
        </Button>
      </div>

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="bg-white sm:max-w-[720px] p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b bg-slate-50">
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Gợi ý từ Hermes Agent
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="text-slate-600">
                {response?.confidence !== undefined ? `Độ tin cậy: ${Math.round(response.confidence * 100)}%` : "Hermes đã trả dữ liệu gợi ý"}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white"
                onClick={() => setSelectedIds(new Set(suggestionItems.map((item) => item.id)))}
              >
                Chọn tất cả
              </Button>
            </div>

            {response?.warnings && response.warnings.length > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {response.warnings.join(" ")}
              </div>
            )}

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              {suggestionItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 border-b border-slate-100 p-3 last:border-b-0 hover:bg-slate-50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={(checked) => toggleField(item.id, checked === true)}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-700">{item.label}</span>
                    <span className="block break-words text-sm text-slate-900">{formatValue(item.value)}</span>
                  </span>
                </label>
              ))}
            </div>

            {response?.ignoredFields && response.ignoredFields.length > 0 && (
              <p className="text-xs text-slate-500">
                Một số field Hermes trả về đã bị bỏ qua vì không hợp lệ: {response.ignoredFields.join(", ")}
              </p>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsReviewOpen(false)} className="bg-white">
              Hủy
            </Button>
            <Button type="button" onClick={applySelected} className="bg-blue-600 hover:bg-blue-700 text-white">
              Áp dụng đã chọn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
