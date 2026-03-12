import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// =====================================================================
// MỞ RỘNG KIỂU DỮ LIỆU (TYPE EXTENSION) CHO NEXT-AUTH
// Bắt buộc phải có để Typescript không báo lỗi khi nhét username/role vào token
// =====================================================================
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      username: string; // Thêm trường custom
      role: string;     // Thêm trường custom
    };
  }
  interface User {
    id: string;
    name: string;
    username: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
  }
}

// =====================================================================
// CẤU HÌNH NEXT AUTH (authOptions)
// =====================================================================
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Tài khoản hệ thống",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 1. Kiểm tra đầu vào
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Vui lòng nhập tên đăng nhập và mật khẩu");
        }

        // 2. Tìm User trong Database theo username
        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user) {
          throw new Error("Tài khoản không tồn tại");
        }

        // 3. So sánh mật khẩu bằng bcrypt
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Mật khẩu không chính xác");
        }

        // CHECK ACCOUNT STATUS
        if (!user.isActive) {
          throw new Error("Tài khoản đã bị vô hiệu hoá");
        }

        // 4. Trả về Object chuẩn hóa (Không có email, không có passwordHash)
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],

  // =====================================================================
  // CALLBACKS (Lõi vận chuyển dữ liệu)
  // =====================================================================
  callbacks: {
    // Bước 1: Nạp dữ liệu từ CSDL (chỉ chạy 1 lần lúc đăng nhập) vào JWT Token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },

    // Bước 2: Truyền dữ liệu từ JWT Token ra ngoài Session để Frontend dùng
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // Sống 30 ngày
  },

  pages: {
    signIn: "/login", // Đường dẫn trang đăng nhập (tự tạo)
  },

  // Yêu cầu phải có trong file .env (VD: NEXTAUTH_SECRET="secret_cua_step_company")
  secret: process.env.NEXTAUTH_SECRET,
};

// =====================================================================
// KHỞI TẠO HANDLER CHO NEXT.JS APP ROUTER
// =====================================================================
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };