import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

function getUserId(session: unknown) {
  return ((session as { user?: { id?: string } } | null)?.user)?.id;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để xem hồ sơ." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, name: true, verifiedEmail: true, role: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để cập nhật hồ sơ." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Họ tên là bắt buộc." }, { status: 400 });
  }
  if (name.length > 100) {
    return NextResponse.json({ error: "Họ tên không được vượt quá 100 ký tự." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: { username: true, name: true, verifiedEmail: true, role: true, createdAt: true },
  });

  return NextResponse.json({ data: user });
}
