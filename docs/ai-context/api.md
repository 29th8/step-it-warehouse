# Danh mục API

[Tổng quan](../../PROJECT_OVERVIEW.md) · [Module](modules.md) · [Kiến trúc](architecture.md)

Danh sách dưới đây dựa trên export handler trong `app/api`; quyền và response từng nhánh chưa được kiểm chứng đầy đủ. Mọi đường dẫn có tiền tố `/api`.

Đối chiếu tĩnh: 48 file `route.ts` hiện diện và từng route/method export được liệt kê. Bảng này chưa mô tả đầy đủ request, response, quyền, validation, lỗi, transaction và side effect cho **cả 48 route**. Khi thực hiện một nhiệm vụ API, mở route cùng các helper và client tương ứng; không dùng bảng này làm hợp đồng API đầy đủ. Các route được gộp trong cùng một hàng có file riêng.

| Đường dẫn | Method |
|---|---|
| `/auth/[...nextauth]` | GET, POST |
| `/auth/register`, `/auth/register/verify`, `/auth/forgot-password`, `/auth/forgot-password/confirm` | POST |
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
| `/assets/recycle-bin`, `/assets/import-template` | GET |
| `/assets/export/report` | GET, POST |
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
| `/profile` | GET, PATCH |
| `/profile/change-password` | POST |
| `/ai/assembly/validate`, `/ai/server-specs/suggest` | POST |
| `/cron/rental-monitor` | GET |
| `/telegram/webhook` | POST |

`proxy.ts` yêu cầu session ngoài các ngoại lệ auth/login/health; bộ lọc này không thiết lập ma trận quyền. Ví dụ xóa vĩnh viễn asset kiểm tra ADMIN và các route thay đổi user kiểm tra user hiện hành; nhiều route khác không kiểm tra rõ vai trò này. Cần xác định quyền nghiệp vụ trước khi sửa endpoint. Cron và webhook cần rà soát xác thực giữa các dịch vụ; xem overview.

`/assets/export/report` yêu cầu session và tài khoản còn hoạt động. GET hỗ trợ export theo bộ lọc hiện tại hoặc điều kiện tùy chọn (`categories`, `statuses` dạng danh sách phân cách bởi dấu phẩy); thêm `countOnly=true` để lấy số lượng dự kiến. POST nhận `assetIds` để export các thiết bị được chọn. Chỉ các cột được allowlist mới được xuất; workbook nhóm thiết bị theo danh mục, mỗi danh mục là một sheet.
