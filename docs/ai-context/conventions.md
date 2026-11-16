# Quy ước và kiểm tra

[Tổng quan](../../PROJECT_OVERVIEW.md) · [Module](modules.md) · [API](api.md)

Các file route dùng NextResponse, Prisma, try/catch và validation tại handler; response không thống nhất giữa các endpoint. Component client thường dùng React state và `fetch`, alias `@/`, toast và UI primitives tại `components/ui`. Tái sử dụng helper nghiệp vụ hiện có khi phù hợp; luôn đọc luồng hiện tại vì convention không đồng nhất tuyệt đối.

`package.json` khai báo `dev`, `build`, `start`, `lint`, `mock:hermes`; không có script test được khai báo. `npx tsc --noEmit` được workflow dùng. Lựa chọn kiểm tra theo phạm vi thay đổi và chỉ báo kết quả đã thực sự chạy. Build hoặc generate có thể ghi output; trong nhiệm vụ chỉ đọc không chạy chúng.

Đừng kết luận dead code hay dependency dư chỉ từ tìm kiếm tên; xác minh route động, import, client bên ngoài và vận hành trước khi thay đổi. Không đọc/ghi giá trị secrets vào tài liệu.
