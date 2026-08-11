import middleware from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";

// Khai báo rõ ràng đây là một hàm (function) để Next.js 16 nhận diện
export default function proxy(request: NextRequest) {
  return middleware(request as NextRequestWithAuth);
}

export const config = {
  // Health check phai truy cap duoc truoc khi nguoi dung dang nhap.
  matcher: ["/((?!login|api/auth|api/health).*)"],
};
