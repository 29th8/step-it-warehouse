import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type Props = { params: Promise<{ id: string }> };

export async function POST(req: Request, props: Props) {
  try {
    const session = await getServerSession(authOptions);
    const identifier = session?.user?.name || (session?.user as any)?.username;
    if (!identifier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUser = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { name: identifier }] }
    });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await props.params;
    const { note } = await req.json().catch(() => ({}));

    const handover = await prisma.handoverRecord.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!handover) return NextResponse.json({ error: "Không tìm thấy biên bản" }, { status: 404 });
    if (handover.status === "RETURNED") return NextResponse.json({ error: "Biên bản đã hoàn trả rồi" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.handoverRecord.update({
        where: { id },
        data: { status: "RETURNED", returnedAt: new Date() }
      });

      for (const item of handover.items) {
        await tx.asset.update({
          where: { id: item.assetId },
          data: { status: "IN_STOCK" }
        });
        await tx.stockMovement.create({
          data: {
            type: "HANDOVER_RETURN",
            note: `Hoàn trả vật tư từ biên bản ${handover.code}. ${note || ""}`.trim(),
            assetId: item.assetId,
            userId: currentUser.id
          }
        });
      }
    });

    return NextResponse.json({ message: `Đã xác nhận hoàn trả biên bản ${handover.code}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi hệ thống" }, { status: 500 });
  }
}
