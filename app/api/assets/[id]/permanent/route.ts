import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { collectDeletedTreeFromAsset } from "@/lib/asset-tree";

type Props = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, props: Props) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Bạn không có quyền xóa vĩnh viễn thiết bị" },
                { status: 403 }
            );
        }

        const userId = session.user.id;

        const resolvedParams = await props.params;
        const assetId = resolvedParams.id;

        const root = await prisma.asset.findUnique({
            where: { id: assetId },
            include: {
                rentalContracts: {
                    where: { status: "ACTIVE" }
                }
            }
        });

        if (!root) return NextResponse.json({ error: "Không tìm thấy thiết bị." }, { status: 404 });

        if (root.rentalContracts.length > 0) {
            return NextResponse.json({ error: "Không thể xoá thiết bị đang có hợp đồng thuê hoạt động." }, { status: 400 });
        }

        const tree = await collectDeletedTreeFromAsset(prisma, assetId);
        if (tree.length === 0) {
            return NextResponse.json({ error: "Thiết bị phải nằm trong thùng rác trước khi xóa vĩnh viễn." }, { status: 400 });
        }

        // Xóa asset và ghi log
        await prisma.$transaction(async (tx) => {
            await tx.stockMovement.create({
                data: {
                    type: "HARD_DELETE",
                    note: `Xoá vĩnh viễn thiết bị khỏi hệ thống. SN: ${root.serialNumber}`,
                    assetId: null, // Không connect vì thiết bị sẽ bị xoá / hoặc SetNull sẽ tự kích hoạt nhưng an toàn hơn là null log
                    userId: userId,
                },
            });

            for (const node of tree) {
                await tx.asset.delete({
                    where: { id: node.id },
                });
            }
        });

        return NextResponse.json({ message: "Xoá vĩnh viễn thiết bị thành công." });
    } catch (error) {
        console.error("HARD DELETE Asset Error:", error);
        return NextResponse.json({ error: "Lỗi hệ thống khi xoá vĩnh viễn thiết bị." }, { status: 500 });
    }
}
