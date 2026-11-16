# Bản đồ module

[Tổng quan](../../PROJECT_OVERVIEW.md) · [API](api.md) · [Dữ liệu](database.md)

Bảng là chỉ mục đường dẫn dựa trên cấu trúc và các lời gọi `fetch`; không chứng minh mọi nhánh xử lý đã được đọc hoặc kiểm thử.

| Chức năng | Module | File source chính | Entry point | Dependency liên quan |
|---|---|---|---|---|
| Sản phẩm, danh mục, thuộc tính | Products | `app/(dashboard)/products/page.tsx`, `components/products/` | `/products`, `app/api/products/route.ts` | category, definition, options, Prisma |
| Thiết bị, lọc, chi tiết | Assets | `app/(dashboard)/assets/page.tsx`, `components/inventory/asset-action-menu.tsx` | `/assets`, `app/api/assets/route.ts` | Product, Warehouse, Rack, Asset |
| Lắp ráp và slot | Inventory | `components/inventory/assembly-config-dialog.tsx`, `lib/server-slots.ts` | `app/api/assembly/route.ts` | Asset cha/con, Hermes; có endpoint khác cần đối chiếu |
| Import/export, thùng rác | Inventory | `components/inventory/import-asset-modal.tsx`, `app/(dashboard)/assets/recycle-bin/page.tsx` | `app/api/assets/import/route.ts`, `app/api/assets/export/report/route.ts` | Excel, restore, Asset |
| Kho | Warehouse | `app/(dashboard)/warehouses/page.tsx`, `components/warehouse/` | `app/api/warehouses/route.ts` | Warehouse, Rack, Asset |
| Rack | Racks | `app/(dashboard)/racks/`, `components/racks/`, `lib/rack-utils.ts` | `app/api/racks/route.ts` | Warehouse, Asset, vị trí U |
| Thuê và trả | Rentals | `app/(dashboard)/rentals/`, `components/rentals/` | `app/api/rentals/route.ts`, `app/api/rentals/return/route.ts` | RentalContract, Asset, cảnh báo |
| Bàn giao | Handovers | `app/(dashboard)/handovers/page.tsx` | `app/api/handovers/route.ts` | HandoverRecord, HandoverItem, Asset, User |
| Tư vấn AI | Hermes | `components/products/server-spec-ai-button.tsx`, `components/inventory/assembly-config-dialog.tsx` | `app/api/ai/` | Hermes API, dữ liệu sản phẩm |
| Cảnh báo thuê | Monitoring | `lib/rental-alert-service.ts`, `lib/email-service.ts`, `lib/telegram-bot-service.ts` | `app/api/cron/rental-monitor/route.ts` | SMTP, Telegram, cron |
| Người dùng và lịch sử | Users/history | `app/(dashboard)/users/`, `app/(dashboard)/history/` | `app/api/users/`, `app/api/system-history/` | NextAuth, User, StockMovement |

`components/inventory/assemble-action.tsx` có lời gọi tới `/api/assets/${parentId}/assemble`; không thấy route tương ứng trong danh mục hiện tại. Chưa xác minh component còn được sử dụng hoặc có consumer khác; không xóa dựa trên tìm kiếm tĩnh.

## Bắt đầu theo luồng

- Sản phẩm: kiểm tra trang products, `components/products/create-product-modal.tsx`, `components/products/product-attribute-manager.tsx`, sau đó route products/category/attribute và schema Product.
- Thiết bị: kiểm tra trang assets, `components/inventory/create-asset-modal.tsx`, `components/inventory/asset-action-menu.tsx`, các route assets và helper trạng thái/slot. Thay đổi lắp ráp cần đọc cả `app/api/assembly/route.ts` và các endpoint thao tác component khác.
- Trả trạng thái linh kiện rời từ `RENTED` về `IN_STOCK`: `lib/asset-status-rules.ts` cho phép khi không có hợp đồng thuê ACTIVE; hai route cập nhật asset cùng dùng helper này. Linh kiện đang gắn và các trạng thái bị khóa khác vẫn áp dụng quy tắc hiện hành.
- Kho/rack: bắt đầu từ các trang và component trong bảng, sau đó đọc `app/api/warehouses/`, `app/api/racks/` và `lib/rack-utils.ts`.
- Thuê: đọc `app/(dashboard)/rentals/create/page.tsx`, `app/api/rentals/route.ts`, `app/api/rentals/return/route.ts` và service cảnh báo; bàn giao: đọc trang handovers, route tạo và `app/api/handovers/[id]/return/route.ts`.
- Đăng nhập/quyền: đọc `app/api/auth/[...nextauth]/route.ts`, `proxy.ts` và handler cụ thể. Deploy: đọc workflow và `scripts/deploy-vps.sh`; xem [deployment.md](deployment.md).

Chưa có ma trận đầy đủ transaction, validation và tác động chéo của từng thao tác. Agent mới vẫn phải đọc các handler liên quan trước khi sửa; các đường dẫn trên là điểm khởi đầu, không khẳng định mọi consumer đã được liệt kê.
