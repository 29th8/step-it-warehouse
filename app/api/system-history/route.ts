import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { Prisma } from "@prisma/client";
import { subDays, startOfDay } from "date-fns";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const sessionIdentifier = session?.user?.name || (session?.user as any)?.username;

        if (!sessionIdentifier) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        const entityType = searchParams.get("entityType") || "ALL";
        const userId = searchParams.get("userId") || "ALL";
        const timeRange = searchParams.get("timeRange") || "ALL";
        const search = searchParams.get("search") || "";

        const whereClause: Prisma.StockMovementWhereInput = {};

        // 1. Filter by Entity Type
        if (entityType === "ASSET") {
            whereClause.assetId = { not: null };
            whereClause.type = { notIn: ["CREATE_USER", "UPDATE_USER", "DELETE_USER", "DISABLE_USER", "ENABLE_USER", "RESET_PASSWORD"] };
        } else if (entityType === "USER") {
            whereClause.targetUserId = { not: null };
        } else if (entityType === "PRODUCT") {
            whereClause.type = { in: ["CREATE_PRODUCT", "UPDATE_PRODUCT", "DELETE_PRODUCT"] };
        } else if (entityType === "WAREHOUSE") {
            whereClause.type = { in: ["CREATE_WAREHOUSE", "UPDATE_WAREHOUSE", "DELETE_WAREHOUSE"] };
        } else if (entityType === "RACK") {
            whereClause.type = { in: ["CREATE_RACK", "UPDATE_RACK", "DELETE_RACK"] };
        } else if (entityType === "RENTAL") {
            whereClause.type = { in: ["CREATE_RENTAL", "UPDATE_RENTAL", "RETURN_RENTAL", "DELETE_RENTAL"] };
        }

        // 2. Filter by Executor
        if (userId !== "ALL" && userId) {
            whereClause.userId = userId;
        }

        // 3. Filter by Time Range
        if (timeRange !== "ALL") {
            const now = new Date();
            if (timeRange === "TODAY") {
                whereClause.createdAt = { gte: startOfDay(now) };
            } else if (timeRange === "7DAYS") {
                whereClause.createdAt = { gte: subDays(now, 7) };
            } else if (timeRange === "30DAYS") {
                whereClause.createdAt = { gte: subDays(now, 30) };
            }
        }

        // 4. Search text (Note or Serial Number)
        if (search) {
            whereClause.OR = [
                { note: { contains: search, mode: "insensitive" } },
                { asset: { serialNumber: { contains: search, mode: "insensitive" } } }
            ];
        }

        const [total, movements] = await prisma.$transaction([
            prisma.stockMovement.count({ where: whereClause }),
            prisma.stockMovement.findMany({
                where: whereClause,
                skip,
                take: limit,
                include: {
                    user: true,
                    targetUser: true,
                    asset: {
                        include: {
                            product: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
            })
        ]);

        return NextResponse.json({
            data: movements,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("GET System History Error:", error);
        return NextResponse.json({ error: "Lỗi tải lịch sử hệ thống" }, { status: 500 });
    }
}
