# Triển khai và vận hành

[Tổng quan](../../PROJECT_OVERVIEW.md) · [Kiến trúc](architecture.md)

Repo khai báo Dockerfile Node 20 Alpine đa giai đoạn, Next standalone và Prisma CLI; Compose khai báo app, PostgreSQL 16, Nginx, cron và Certbot. PostgreSQL dùng volume được đặt tên; không giả định database local và production giống nhau.

Workflow `.github/workflows/deploy.yml` chạy typecheck/build, push image GHCR theo SHA và SSH tới VPS khi push main. Bước deploy kiểm tra tracked changes, fetch/checkout commit, gọi `scripts/deploy-vps.sh`. Script pull image, backup, migrate, thay container và chờ health; rollback chỉ là app image, không phục hồi DB. `scripts/backup.sh` dùng pg_dump/gzip, kiểm tra gzip và dọn backup cũ theo retention; gzip hợp lệ không chứng minh restore thành công.

Workflow và `scripts/cleanup-docker-vps.sh` dọn cache/image; thao tác có thể ảnh hưởng Docker dùng chung host. Cleanup sau khi app healthy có thể làm job báo thất bại dù app mới đã chạy. Migration có thể không tương thích image cũ. Nginx tham chiếu `inventory-mcp` không thấy khai báo trong Compose; phụ thuộc môi trường thực tế.

Các nội dung này là cấu hình repo, không xác minh trạng thái VPS, secrets, restore, network hoặc monitoring hiện hành. Không chạy deploy, restart, cleanup, migration hoặc restore production khi chưa có yêu cầu và đánh giá phù hợp.
