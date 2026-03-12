import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const sessionIdentifier = session?.user?.name || (session?.user as any)?.username;

        if (!sessionIdentifier) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const assets = await prisma.asset.findMany({
            where: {
                deletedAt: {
                    not: null
                }
            },
            include: {
                product: true,
            },
            orderBy: { deletedAt: "desc" },
        });

        return NextResponse.json(assets);
    } catch (error) {
        console.error("GET Recycle Bin Assets Error:", error);
        return NextResponse.json({ error: "Lỗi tải dữ liệu" }, { status: 500 });
    }
}
