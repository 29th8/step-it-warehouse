import { z } from "zod";

// Attributes are dynamic and controlled by ProductAttributeDefinition.
export const productAttributesSchema = z.record(z.string(), z.any()).nullable().optional();

export const ProductSchema = z.object({
    name: z.string().min(3, "Tên bắt buộc và > 3 ký tự"),
    modelNumber: z.string().min(2, "Model number bắt buộc"),
    category: z.string().min(1, "Danh mục bắt buộc"),
    type: z.string().optional(), // Now flexible text
    vendor: z.string().min(1, "Nhà cung cấp bắt buộc"),
    description: z.string().optional(),
    attributes: productAttributesSchema
});
