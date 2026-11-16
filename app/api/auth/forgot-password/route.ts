import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetCode } from "@/lib/email-service";

const genericMessage = "Nếu email đủ điều kiện, mã xác thực sẽ được gửi tới hộp thư của bạn.";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { verifiedEmail: email }, select: { isActive: true } });
    if (!user?.isActive) return NextResponse.json({ message: genericMessage });

    const existing = await prisma.passwordResetChallenge.findUnique({ where: { email } });
    if (existing && Date.now() - existing.createdAt.getTime() < 60_000) return NextResponse.json({ message: genericMessage });
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const codeHash = await bcrypt.hash(code, 10);
    const now = new Date();
    await prisma.passwordResetChallenge.upsert({
      where: { email },
      create: { email, codeHash, expiresAt: new Date(now.getTime() + 600_000), createdAt: now },
      update: { codeHash, expiresAt: new Date(now.getTime() + 600_000), attempts: 0, createdAt: now },
    });
    await sendPasswordResetCode(email, code);
    return NextResponse.json({ message: genericMessage });
  } catch (error) {
    console.error("Password reset request failed", error);
    return NextResponse.json({ error: "Không thể xử lý yêu cầu. Vui lòng thử lại sau." }, { status: 500 });
  }
}
