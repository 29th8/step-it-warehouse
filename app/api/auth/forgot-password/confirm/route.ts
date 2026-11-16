import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || email.length > 100 || !/^\d{6}$/.test(code) || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return NextResponse.json({ error: "Thông tin không hợp lệ. Mật khẩu cần ít nhất 8 ký tự và không quá 72 byte." }, { status: 400 });
    }
    const challenge = await prisma.passwordResetChallenge.findUnique({ where: { email } });
    if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= 5) {
      return NextResponse.json({ error: "Mã không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới." }, { status: 400 });
    }
    const attempt = await prisma.passwordResetChallenge.updateMany({
      where: { email, codeHash: challenge.codeHash, attempts: { lt: 5 }, expiresAt: { gt: new Date() } },
      data: { attempts: { increment: 1 } },
    });
    if (attempt.count !== 1 || !(await bcrypt.compare(code, challenge.codeHash))) {
      return NextResponse.json({ error: "Mã không hợp lệ hoặc đã hết hạn." }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetChallenge.deleteMany({ where: { email, codeHash: challenge.codeHash, expiresAt: { gt: new Date() } } });
      if (consumed.count !== 1) throw new Error("CODE_ALREADY_USED");
      const result = await tx.user.updateMany({ where: { verifiedEmail: email, isActive: true }, data: { passwordHash } });
      if (result.count !== 1) throw new Error("USER_NOT_AVAILABLE");
    });
    return NextResponse.json({ message: "Đã đặt lại mật khẩu. Bạn có thể đăng nhập." });
  } catch (error) {
    console.error("Password reset failed", error);
    return NextResponse.json({ error: "Không thể đặt lại mật khẩu. Vui lòng thử lại." }, { status: 400 });
  }
}
