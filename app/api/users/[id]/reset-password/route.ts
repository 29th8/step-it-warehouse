import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const currentUser = session?.user as any;

        if (!currentUser || currentUser.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const { newPassword } = body;

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data: { passwordHash },
            });

            await tx.stockMovement.create({
                data: {
                    type: "RESET_PASSWORD",
                    note: `Reset mật khẩu cho user: ${existingUser.username}`,
                    userId: currentUser.id,
                    targetUserId: existingUser.id,
                },
            });
        });

        return NextResponse.json({ success: true, message: "Password reset correctly." });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
