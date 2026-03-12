import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, props: Props) {
    try {
        const session = await getServerSession(authOptions);
        const sessionIdentifier = session?.user?.name || (session?.user as any)?.username;

        if (!sessionIdentifier) {
            return NextResponse.json({ error: "Unauthorized. Vui lòng đăng nhập!" }, { status: 401 });
        }

        const currentUser = await prisma.user.findFirst({
            where: { OR: [{ username: sessionIdentifier }, { name: sessionIdentifier }] }
        });

        if (!currentUser) return NextResponse.json({ error: "Tài khoản không tồn tại." }, { status: 404 });
        const userId = currentUser.id;

        const resolvedParams = await props.params;
        const assetId = resolvedParams.id;

        const existingAsset = await prisma.asset.findUnique({ where: { id: assetId } });
        if (!existingAsset) return NextResponse.json({ error: "Không tìm thấy thiết bị." }, { status: 404 });

        // Cập nhật lại asset và lưu log StockMovement
        await prisma.$transaction(async (tx) => {
            await tx.asset.update({
                where: { id: assetId },
                data: {
                    status: "IN_STOCK",
                    deletedAt: null,
                    deletedById: null,
                    rackId: null,
                    rackUnit: null,
                    parentId: null,
                },
            });

            await tx.stockMovement.create({
                data: {
                    type: "RESTORE",
                    note: `Khôi phục thiết bị ${existingAsset.serialNumber} từ Recycle Bin.`,
                    asset: { connect: { id: assetId } },
                    user: { connect: { id: userId } }
                },
            });
        });

        return NextResponse.json({ message: "Khôi phục thiết bị thành công." });
    } catch (error) {
        console.error("RESTORE Asset Error:", error);
        return NextResponse.json({ error: "Lỗi hệ thống khi khôi phục thiết bị." }, { status: 500 });
    }
}
