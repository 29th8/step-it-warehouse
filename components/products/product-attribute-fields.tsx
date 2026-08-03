"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ProductAttributeOption = {
  id: string;
  value: string;
  label?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type ProductAttributeDefinition = {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  inputType: "TEXT" | "SELECT" | "NUMBER" | "BOOLEAN";
  required: boolean;
  sortOrder: number;
  isActive: boolean;
  options: ProductAttributeOption[];
};

type ProductAttributeFieldsProps = {
  definitions: ProductAttributeDefinition[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
};

export function ProductAttributeFields({ definitions, values, onChange }: ProductAttributeFieldsProps) {
  const activeDefinitions = definitions
    .filter((definition) => definition.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  if (activeDefinitions.length === 0) return null;

  const setValue = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="bg-slate-50/70 border border-slate-200 p-4 rounded-lg space-y-4">
      <h4 className="text-sm font-semibold text-slate-800">Thông số theo danh mục</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeDefinitions.map((definition) => {
          const label = `${definition.label}${definition.required ? " *" : ""}`;
          const currentValue = values?.[definition.key] ?? "";
          const inputValue = typeof currentValue === "string" || typeof currentValue === "number" ? currentValue : "";
          const positiveIntegerKeys = ["uHeight", "dimmSlots", "driveBays"];
          const isPositiveIntegerAttribute = positiveIntegerKeys.includes(definition.key);

          if (definition.inputType === "SELECT" || definition.inputType === "BOOLEAN") {
            const options = definition.inputType === "BOOLEAN"
              ? [
                { id: "true", value: "true", label: "Có" },
                { id: "false", value: "false", label: "Không" },
              ]
              : definition.options.filter((option) => option.isActive !== false);

            return (
              <div key={definition.id} className="space-y-2">
                <label className="text-xs font-medium text-slate-700">{label}</label>
                <Select
                  value={String(currentValue)}
                  onValueChange={(value) => setValue(definition.key, definition.inputType === "BOOLEAN" ? value === "true" : value)}
                >
                  <SelectTrigger className="h-11 bg-white sm:h-9">
                    <SelectValue placeholder={`Chọn ${definition.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.id} value={option.value}>
                        {option.label || option.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }

          return (
            <div key={definition.id} className="space-y-2">
              <label className="text-xs font-medium text-slate-700">{label}</label>
              <Input
                type={definition.inputType === "NUMBER" ? "number" : "text"}
                min={isPositiveIntegerAttribute ? 1 : undefined}
                step={isPositiveIntegerAttribute ? 1 : undefined}
                className="h-11 bg-white sm:h-9"
                value={inputValue}
                placeholder={`Nhập ${definition.label.toLowerCase()}`}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isPositiveIntegerAttribute && value !== "" && Number(value) < 1) return;
                  setValue(definition.key, value);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function validateRequiredAttributes(definitions: ProductAttributeDefinition[], values: Record<string, unknown>) {
  const missing = definitions
    .filter((definition) => definition.isActive && definition.required)
    .filter((definition) => values?.[definition.key] === undefined || values?.[definition.key] === null || String(values?.[definition.key]).trim() === "")
    .map((definition) => definition.label);

  return missing;
}
