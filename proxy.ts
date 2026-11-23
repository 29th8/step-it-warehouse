import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isSessionCurrent } from "@/lib/session-policy";

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  let authorized = false;
  if (token && typeof token.id === "string" && isSessionCurrent(token)) {
    try {
      const user = await prisma.user.findUnique({ where: { id: token.id }, select: { isActive: true, role: true } });
      authorized = Boolean(user?.isActive && user.role === token.role);
    } catch {
      return NextResponse.json({ error: "Không thể kiểm tra phiên đăng nhập." }, { status: 503 });
    }
  }
  if (authorized) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn hoặc không còn quyền truy cập." }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!login|register|forgot-password|api/auth|api/health|_next/static|_next/image|favicon.ico).*)"],
};
