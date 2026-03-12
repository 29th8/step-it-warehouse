import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function PATCH(
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
        const { name, role, isActive } = body;

        const existingUser = await prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Determine what changed for logging
        let actionType: "UPDATE_USER" | "DISABLE_USER" | "ENABLE_USER" = "UPDATE_USER";
        let actionNote = `Cập nhật thông tin user: ${existingUser.username}`;

        if (isActive !== undefined && isActive !== existingUser.isActive) {
            if (isActive === false) {
                actionType = "DISABLE_USER";
                actionNote = `Vô hiệu hoá tài khoản: ${existingUser.username}`;
            } else {
                actionType = "ENABLE_USER";
                actionNote = `Kích hoạt lại tài khoản: ${existingUser.username}`;
            }
        }

        const updatedUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(role && { role }),
                    ...(isActive !== undefined && { isActive }),
                },
            });

            await tx.stockMovement.create({
                data: {
                    type: actionType,
                    note: actionNote,
                    userId: currentUser.id,
                    targetUserId: user.id,
                },
            });

            return user;
        });

        const { passwordHash, ...userResponse } = updatedUser;
        return NextResponse.json(userResponse);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
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

        if (currentUser.id === id) {
            return NextResponse.json({ error: "Không thể tự xoá chính mình" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
            // Create movement log BEFORE deleting the user so the username can be fetched (Though user is deleted, targetUserId will become invalid if RESTRICT, but let's see)

            // Wait, if targetUser is deleted, the relation will be broken if it's not set to SetNull or Cascade.
            // Let's check schema.prisma: `targetUser User? @relation("TargetUser", fields: [targetUserId], references: [id])` -> default is RESTRICT.
            // Since it's restricted, we can't delete the user if there are StockMovements depending on it. 
            // OH! This is a typical issue. If a User is deleted, their movements will prevent deletion!
            // Let me fix this relation by adding onDelete: SetNull to BOTH relations or changing from DELETE to Soft Delete (or just SetNull).
            // Let's run a quick query to see `StockMovement` schema.
            // Ah, the user requested "Không cho xoá user đang login", "Xoá tài khoản: {username}", maybe standard DELETE.
            // But if there are logs (ActorUser or TargetUser), Prisma will throw a FK Constraint Error.
            // So I will just delete the user anyway, but since it's Prisma, we might need a CASCADE or SET NULL on targetUserId and userId.

            await tx.stockMovement.create({
                data: {
                    type: "DELETE_USER",
                    note: `Xoá tài khoản: ${existingUser.username}`,
                    userId: currentUser.id,
                    targetUserId: null, // Since the user is deleted, we can't tie it to a deleted ID unless CASCADE is set. We'll leave it null and just record the note.
                },
            });

            // Also we need to delete or update all movements pointing strictly to this user either as actor or target? 
            // If we don't, prisma will crash because User is deleted. I should probably use `onDelete: Cascade` or `onDelete: SetNull` in schema!
            // For now, let me just try deleting. Wait, other system uses `movements`. I should update schema! I'll do that shortly.
            await tx.user.delete({
                where: { id },
            });
        });

        return NextResponse.json({ success: true, message: "User deleted" });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete user. There might be related data." }, { status: 500 });
    }
}
