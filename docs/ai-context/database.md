# Database

[Tổng quan](../../PROJECT_OVERVIEW.md) · [Module](modules.md) · [API](api.md)

`prisma/schema.prisma` khai báo PostgreSQL và 12 model. ProductCategory có Product và ProductAttributeDefinition; definition có ProductAttributeOption. Product chứa `attributes` JSON, có nhiều Asset. Asset thuộc Warehouse, có thể thuộc Rack và có quan hệ cha/con tự tham chiếu; kết nối StockMovement, RentalContract và HandoverItem. User liên kết movement và handover. HandoverRecord có nhiều HandoverItem.

Serial, modelNumber, username, category code và handover code là unique. Snapshot `previous*` của Asset là chuỗi/trạng thái để phục hồi, không phải foreign key. Attribute definition unique theo category/key; option unique theo definition/value. Kiểm tra cả `lib/asset-status-rules.ts`, `lib/server-slots.ts` và các transaction khi đổi bất biến.

Có 10 migration SQL. Migration đầu chuyển enum category có sẵn thành bảng và tham chiếu bảng Product hiện hữu; chưa chứng minh bộ migration đủ dựng database trống. Các migration tiếp theo xử lý trạng thái component, snapshot xóa mềm, thanh lý, thuộc tính động, chiều cao U và slot server. Chưa kiểm tra lịch sử production hay thực hành restore; không áp migration lên database thật để khảo sát.

Các truy vấn danh sách và JSON attributes cần đo bằng dữ liệu thực tế trước khi thay index. Tình trạng thiếu index hoặc tốc độ chưa được đo; xem mục code review trong overview.
