# Hướng dẫn làm việc

## Quick Start for New AI Agents

1. Đọc file này, sau đó đọc phần phạm vi và rủi ro trong [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md); kiểm tra `git status` để nhận biết thay đổi đang có.
2. Với yêu cầu nghiệp vụ, tìm trang, component và endpoint tương ứng trong [modules.md](./docs/ai-context/modules.md); dùng [api.md](./docs/ai-context/api.md) để xác định method và mở route thực tế.
3. Với đăng nhập hoặc quyền, đọc [architecture.md](./docs/ai-context/architecture.md), `proxy.ts` và route auth, rồi kiểm tra authorization của từng handler liên quan. Với dữ liệu, đọc [database.md](./docs/ai-context/database.md), schema và migration liên quan.
4. Với vận hành, đọc [deployment.md](./docs/ai-context/deployment.md), workflow và script thực tế; không suy ra trạng thái production từ repository.
5. Đối chiếu source trước khi kết luận: tài liệu là bản đồ, không phải đặc tả đã kiểm thử. Xác định phạm vi ảnh hưởng, kiểm tra phù hợp và báo cáo những phần chưa xác minh.

## Chọn tài liệu theo nhiệm vụ

- Tổng quan, rủi ro và phạm vi đã kiểm tra: [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md).
- Kiến trúc, xác thực và tích hợp: [architecture.md](./docs/ai-context/architecture.md).
- Tìm chức năng, trang, API và dependency: [modules.md](./docs/ai-context/modules.md).
- Schema và migration: [database.md](./docs/ai-context/database.md).
- Danh sách endpoint và lưu ý quyền: [api.md](./docs/ai-context/api.md).
- Docker, backup, rollback và CI/CD: [deployment.md](./docs/ai-context/deployment.md).
- Cách tổ chức mã và kiểm tra: [conventions.md](./docs/ai-context/conventions.md).

Các tài liệu chuyên đề đang trong quá trình hoàn thiện; đọc source liên quan trước khi thay đổi và không coi nội dung chưa xác minh là đặc tả nghiệp vụ.

## Duy trì tài liệu

Khi thay đổi source, cập nhật tài liệu liên quan trong cùng thay đổi: route/method/quyền trong `api.md`, entry point và dependency trong `modules.md`, schema/migration trong `database.md`, luồng xác thực/tích hợp trong `architecture.md`, quy trình vận hành trong `deployment.md`. Cập nhật overview khi ảnh hưởng tổng thể hoặc rủi ro thay đổi. Kiểm tra đường dẫn, phân biệt hành vi đã xác minh với giả định, và không ghi secrets. Không khẳng định một luồng đã được kiểm thử nếu chưa chạy thực tế.

## Project context

STEP IT Warehouse quản lý sản phẩm, thiết bị, kho/rack, lắp ráp, cho thuê và bàn giao. Next.js App Router/React/TypeScript phục vụ UI và API; Prisma truy cập PostgreSQL. Đọc [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) trước khi làm việc: tài liệu đang khảo sát dở dang, không thay thế việc đọc mã liên quan.

## Code structure và convention

- `app/(auth)`, `app/(dashboard)`: trang và layout; `app/api`: Next.js route handlers.
- `components`: UI theo nghiệp vụ và primitives; `context`: state sidebar; `lib`: nghiệp vụ, helper, validation và tích hợp; `types`: kiểu dùng chung.
- `prisma/schema.prisma`, `prisma/migrations`, `prisma/seed.ts`: dữ liệu; `.github/workflows`, `Dockerfile`, `docker-compose.yml`, `docker`, `nginx`, `scripts`: triển khai.
- Theo convention thực tế của module: alias `@/`, components React, `fetch` tới route, Prisma và `NextResponse`; nhiều route tự validate và dùng try/catch, transaction và StockMovement. Response/API và quyền không hoàn toàn đồng nhất: kiểm tra contract của route trước khi thay đổi. Ưu tiên tái sử dụng helper hiện có và giữ bất biến asset, rack, slot, lịch sử.

## Development và kiểm tra

1. Đọc hướng dẫn này, tham khảo overview; xác định và đọc các module, luồng, API, dữ liệu và quyền liên quan trước khi sửa.
2. Đánh giá ảnh hưởng các module; trình bày phương án trước thay đổi rủi ro lớn. Giữ thay đổi nhỏ, không tự đổi kiến trúc, phá API, xóa code cũ chưa xác minh hoặc thay đổi chức năng ngoài yêu cầu.
3. Kiểm tra `package.json`: `npm run dev`, `npm run build`, `npm start`, `npm run lint`, `npm run mock:hermes`; không có script test khai báo. Chọn kiểm tra phù hợp, chỉ báo thành công khi đã chạy; nêu rõ những gì chưa chạy và lý do. Không giả định local và production dùng cùng database.
4. Báo cáo file đã đổi và lý do; không tự commit, push hoặc deploy khi chưa được yêu cầu.

## Deployment và an toàn

Workflow build image GHCR theo SHA và SSH tới VPS; `scripts/deploy-vps.sh` backup trước migration, recreate app và thử rollback image khi health lỗi, nhưng không tự restore DB. Cấu hình chính: workflow, Dockerfile, Compose, `docker/entrypoint.sh`, `nginx/nginx.conf`, script deploy/backup/cleanup. Kiểm tra mã thực tế trước khi vận hành; overview ghi các rủi ro đã biết.

Không tự deploy, restart/xóa service, thay đổi database production hoặc cleanup có nguy cơ mất dữ liệu; xin xác nhận trước thao tác có thể gây downtime. Không đọc hoặc tiết lộ giá trị bí mật. Không suy đoán trạng thái VPS từ cấu hình repository.
