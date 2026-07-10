import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { collectDeletedTreeFromAsset, resolveRestoredStatus } from "@/lib/asset-tree";

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

        const tree = await collectDeletedTreeFromAsset(prisma, assetId);
        if (tree.length === 0) return NextResponse.json({ error: "Không tìm thấy thiết bị." }, { status: 404 });

        await prisma.$transaction(async (tx) => {
            for (const node of tree) {
                const restoredParentId = node.previousParentId ?? node.parentId ?? null;

                await tx.asset.update({
                    where: { id: node.id },
                    data: {
                        status: resolveRestoredStatus(node, restoredParentId) as any,
                        deletedAt: null,
                        deletedById: null,
                        parentId: restoredParentId,
                        warehouseId: node.previousWarehouseId ?? node.warehouseId ?? undefined,
                        rackId: node.previousRackId ?? node.rackId ?? null,
                        rackUnit: node.previousRackUnit ?? node.rackUnit ?? null,
                        previousStatus: null,
                        previousParentId: null,
                        previousWarehouseId: null,
                        previousRackId: null,
                        previousRackUnit: null,
                    },
                });

                await tx.stockMovement.create({
                    data: {
                        type: "RESTORE",
                        note: `Khôi phục thiết bị ${node.serialNumber} từ Recycle Bin.`,
                        asset: { connect: { id: node.id } },
                        user: { connect: { id: userId } }
                    },
                });
            }
        });

        return NextResponse.json({ message: "Khôi phục thiết bị và toàn bộ linh kiện con thành công." });
    } catch (error) {
        console.error("RESTORE Asset Error:", error);
        return NextResponse.json({ error: "Lỗi hệ thống khi khôi phục thiết bị." }, { status: 500 });
    }
}
