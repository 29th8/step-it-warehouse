import { z } from "zod";
import { ProductCategory } from "@prisma/client";

// Core Attributes Typings
export const productAttributesSchema = z.object({
    generation: z.string().optional(),
    capacity: z.string().optional(),
    speed: z.string().optional(),
    interface: z.string().optional(),
    type: z.string().optional(),
    series: z.string().optional(),
    formFactor: z.string().optional()
}).nullable().optional();

export const ProductSchema = z.object({
    name: z.string().min(3, "Tên bắt buộc và > 3 ký tự"),
    modelNumber: z.string().min(2, "Model number bắt buộc"),
    category: z.nativeEnum(ProductCategory, { error: "Danh mục không hợp lệ" }),
    type: z.string().optional(), // Now flexible text
    vendor: z.string().min(1, "Nhà cung cấp bắt buộc"),
    description: z.string().optional(),
    attributes: productAttributesSchema
}).superRefine((data, ctx) => {
    const { category, attributes } = data;
    const isMemory = category === "MEMORY";
    const isStorage = category === "STORAGE";
    const isServer = category === "SERVER";

    if (isMemory) {
        if (!attributes?.generation || !attributes?.capacity) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["attributes"],
                message: "Sản phẩm bộ nhớ (MEMORY) phải có Generation và Capacity"
            });
        }
    }

    if (isStorage) {
        if (!attributes?.type || !attributes?.capacity) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["attributes"],
                message: "Sản phẩm lưu trữ (STORAGE) phải có Type và Capacity"
            });
        }
    }

    if (isServer) {
        if (attributes && Object.keys(attributes).length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["attributes"],
                message: "Sản phẩm máy chủ (SERVER) không được có thuộc tính (attributes phải rỗng)"
            });
        }
    }
});
