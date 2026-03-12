import middleware from "next-auth/middleware";
import type { NextRequest } from "next/server";

// Khai báo rõ ràng đây là một hàm (function) để Next.js 16 nhận diện
export default function proxy(request: NextRequest) {
  return (middleware as any)(request);
}

export const config = {
  // Bảo vệ tất cả các trang trừ trang login và api/auth
  matcher: ["/((?!login|api/auth).*)"],
};