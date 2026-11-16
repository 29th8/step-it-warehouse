import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!email || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Email hoặc mã xác thực không hợp lệ." }, { status: 400 });

    const challenge = await prisma.registrationChallenge.findUnique({ where: { email } });
    if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= 5) {
      return NextResponse.json({ error: "Mã đã hết hạn hoặc vượt số lần thử. Vui lòng yêu cầu mã mới." }, { status: 400 });
    }
    const attempt = await prisma.registrationChallenge.updateMany({
      where: { email, codeHash: challenge.codeHash, attempts: { lt: 5 }, expiresAt: { gt: new Date() } },
      data: { attempts: { increment: 1 } },
    });
    if (attempt.count !== 1 || !(await bcrypt.compare(code, challenge.codeHash))) {
      return NextResponse.json({ error: "Mã xác thực không đúng hoặc đã hết hạn." }, { status: 400 });
    }
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.registrationChallenge.deleteMany({ where: { email, codeHash: challenge.codeHash, expiresAt: { gt: new Date() } } });
      if (consumed.count !== 1) throw new Error("CODE_ALREADY_USED");
      await tx.user.create({ data: { username: email, verifiedEmail: email, name: challenge.name, passwordHash: challenge.passwordHash, role: "USER", isActive: true } });
    });
    return NextResponse.json({ message: "Xác thực thành công. Bạn có thể đăng nhập." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email đã được sử dụng." }, { status: 409 });
    }
    console.error("Registration verification failed", error);
    return NextResponse.json({ error: "Không thể xác thực mã. Vui lòng thử lại." }, { status: 500 });
  }
}
