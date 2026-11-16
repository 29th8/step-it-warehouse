# Danh mục API

[Tổng quan](../../PROJECT_OVERVIEW.md) · [Module](modules.md) · [Kiến trúc](architecture.md)

Danh sách dưới đây dựa trên export handler trong `app/api`; quyền và response từng nhánh chưa được kiểm chứng đầy đủ. Mọi đường dẫn có tiền tố `/api`.

Đối chiếu tĩnh: 42 file `route.ts` hiện diện và từng route/method export được liệt kê. Bảng này chưa mô tả đầy đủ request, response, quyền, validation, lỗi, transaction và side effect cho **cả 42 route**. Khi thực hiện một nhiệm vụ API, mở route cùng các helper và client tương ứng; không dùng bảng này làm hợp đồng API đầy đủ. Các route được gộp trong cùng một hàng có file riêng.

| Đường dẫn | Method |
|---|---|
| `/auth/[...nextauth]` | GET, POST |
| `/dashboard`, `/health`, `/movements`, `/system-history` | GET |
| `/products` | GET, POST |
| `/products/[id]` | GET, PATCH, DELETE |
| `/products/taxonomy` | GET |
| `/product-categories` | GET, POST |
| `/product-categories/[id]` | PATCH, DELETE |
| `/product-attribute-definitions` | GET, POST |
| `/product-attribute-definitions/[id]` | PATCH, DELETE |
| `/product-attribute-options` | POST, PATCH |
| `/product-attribute-options/[id]` | PATCH, DELETE |
| `/assets` | GET, POST |
| `/assets/[id]` | GET, PATCH, DELETE |
| `/assets/[id]/status`, `/assets/[id]/restore` | PATCH |
| `/assets/[id]/permanent` | DELETE |
| `/assets/recycle-bin`, `/assets/import-template`, `/assets/export/report` | GET |
| `/assets/import`, `/assets/assemble`, `/assets/disassemble`, `/assets/move-component`, `/assembly` | POST |
| `/warehouses` | GET, POST |
| `/warehouses/[id]` | GET, PATCH, DELETE |
| `/racks` | GET, POST, PATCH, DELETE |
| `/racks/[id]` | GET |
| `/rentals` | GET, POST |
| `/rentals/return` | POST |
| `/handovers` | GET, POST |
| `/handovers/[id]/return` | POST |
| `/users` | GET, POST |
| `/users/[id]` | PATCH, DELETE |
| `/users/[id]/reset-password` | POST |
| `/ai/assembly/validate`, `/ai/server-specs/suggest` | POST |
| `/cron/rental-monitor` | GET |
| `/telegram/webhook` | POST |

`proxy.ts` yêu cầu session ngoài các ngoại lệ auth/login/health; bộ lọc này không thiết lập ma trận quyền. Ví dụ xóa vĩnh viễn asset kiểm tra ADMIN và các route thay đổi user kiểm tra user hiện hành; nhiều route khác không kiểm tra rõ vai trò này. Cần xác định quyền nghiệp vụ trước khi sửa endpoint. Cron và webhook cần rà soát xác thực giữa các dịch vụ; xem overview.
