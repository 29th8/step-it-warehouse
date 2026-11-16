# Kiến trúc

[Tổng quan](../../PROJECT_OVERVIEW.md) · [Module](modules.md) · [API](api.md) · [Dữ liệu](database.md) · [Triển khai](deployment.md)

Đã xác minh qua cấu trúc source: Next.js App Router chứa trang React và route handlers. Giao diện dùng `fetch` đến API cùng ứng dụng; nhiều handler trực tiếp gọi Prisma/PostgreSQL. State thường là React state, sidebar có context; chưa khảo sát mọi trang.

`app/api/auth/[...nextauth]/route.ts` dùng Credentials, bcrypt và JWT 30 ngày. Khi đăng nhập kiểm tra `isActive`, JWT giữ id, username, role; callback không tra lại user ở các lần sau. `proxy.ts` dùng NextAuth middleware và loại trừ login, auth, health. Đăng nhập không đồng nghĩa đã có quyền cho mọi nghiệp vụ: cần đọc từng route. Sidebar ẩn mục không phải authorization server.

Luồng đăng ký email mới dùng `app/api/auth/register/route.ts` gửi mã SMTP và `app/api/auth/register/verify/route.ts` xác thực trước khi tạo user USER đang hoạt động; email được dùng làm username. Schema bổ sung RegistrationChallenge qua migration; chưa xác minh gửi mail thực tế. Cần bảo vệ endpoint công khai bằng giới hạn theo IP và giám sát trước khi đưa lên production.

Luồng quên mật khẩu trong `app/api/auth/forgot-password/` gửi mã tới `User.verifiedEmail`, đặt lại mật khẩu sau xác thực và không tự kích hoạt user bị khóa. Email đăng ký sau migration được đánh dấu xác thực; tài khoản cũ không được tự động tin cậy và cần ADMIN hỗ trợ. `PasswordResetChallenge` và `verifiedEmail` yêu cầu migration riêng. JWT hiện tại không tự thu hồi khi đổi mật khẩu. Chưa kiểm thử end-to-end; cần giới hạn yêu cầu theo IP trước production.

Hermes có hai route trong `app/api/ai`, gọi dịch vụ ngoài với timeout/token cấu hình qua environment. SMTP nằm ở `lib/email-service.ts`; Telegram ở `lib/telegram-bot-service.ts` và webhook; `lib/rental-alert-service.ts` giám sát hợp đồng. Đọc [deployment.md](deployment.md) trước khi thay đổi cron/proxy. Cấu hình thực tế của các dịch vụ chưa được kiểm tra.

Chưa xác minh toàn bộ luồng UI, quyền endpoint, giao tiếp ngoài, hoặc hành vi chạy thực tế. Không suy ra không có dependency bên ngoài chỉ vì Compose không khai báo.
