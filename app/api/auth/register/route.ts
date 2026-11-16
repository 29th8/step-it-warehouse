import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendRegistrationCode } from "@/lib/email-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (name.length < 2 || name.length > 100 || email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Họ tên hoặc email không hợp lệ." }, { status: 400 });
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return NextResponse.json({ error: "Mật khẩu cần ít nhất 8 ký tự và không quá 72 byte." }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { username: email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Email đã được sử dụng." }, { status: 409 });
    const challenge = await prisma.registrationChallenge.findUnique({ where: { email } });
    if (challenge && Date.now() - challenge.createdAt.getTime() < 60_000) {
      return NextResponse.json({ error: "Vui lòng chờ 60 giây trước khi yêu cầu mã mới." }, { status: 429 });
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const [passwordHash, codeHash] = await Promise.all([bcrypt.hash(password, 10), bcrypt.hash(code, 10)]);
    const now = new Date();
    await prisma.registrationChallenge.upsert({
      where: { email },
      create: { email, name, passwordHash, codeHash, expiresAt: new Date(now.getTime() + 600_000), createdAt: now },
      update: { name, passwordHash, codeHash, expiresAt: new Date(now.getTime() + 600_000), attempts: 0, createdAt: now },
    });
    await sendRegistrationCode(email, code);
    return NextResponse.json({ message: "Đã gửi mã xác thực. Vui lòng kiểm tra email." });
  } catch (error) {
    console.error("Registration request failed", error);
    return NextResponse.json({ error: "Không thể gửi mã xác thực. Vui lòng thử lại sau." }, { status: 500 });
  }
}
