# Triển khai và vận hành

## Gia hạn chứng chỉ VPS

Trên VPS kho, crontab của user `step` chạy `/home/step/warehouse-cert-renew.sh` lúc 03:17 và 15:17 UTC. Script nguồn local là `scripts/renew-warehouse-certificate.sh`; bản trên VPS độc lập với checkout deploy và cần được đồng bộ khi sửa script. Job chạy Certbot trong container dùng volume Compose hiện hữu, sau đó so sánh chứng chỉ trên đĩa với chứng chỉ Nginx đang phục vụ; khi khác, kiểm tra cấu hình và reload Nginx. Log: `/home/step/warehouse-cert-renew.log`; backup crontab trước khi thêm job: `/home/step/crontab-before-cert-20261123.bak`. Let’s Encrypt staging dry-run đã thành công; lần gia hạn thực tế tiếp theo và cảnh báo lỗi tự động chưa được xác minh. Không chạy song song thêm vòng lặp Certbot mà chưa đánh giá xung đột.

## Kiểm thử phiên trên local

`scripts/test-session-integration.cjs` chỉ chạy khi `DATABASE_URL` trỏ tới `127.0.0.1:55439/session_test` và `SESSION_TEST_URL` là `http://localhost:3117`. Cần tạo PostgreSQL thử nghiệm riêng, tạo schema từ `prisma/schema.prisma`, tạo user `session_test` role ADMIN với mật khẩu test của script, và chạy bản sao ứng dụng với `NEXTAUTH_SECRET` thử nghiệm. Không trỏ script hay `prisma db push` vào database kho. Script kiểm tra đăng nhập, cập nhật hoạt động, JWT hết hạn, role/khóa tài khoản và redirect; không thay thế test trình duyệt nhiều tab hoặc build production.

Đã kiểm tra bản build webpack local với database thử nghiệm: build thành công, script API thành công; Chrome headless xác nhận đăng nhập qua form, chuyển tới URL ban đầu, cảnh báo trước hạn khi mô phỏng thời gian và một tab không đăng xuất ở hạn cũ sau khi tab khác gia hạn phiên. Chưa kiểm tra toàn bộ trường hợp nhiều tab đồng thời hoặc container production thực tế; `next start` đã được dùng để thử API và trình duyệt.

Khi thử migration vào database rỗng, `prisma migrate deploy` thất bại ở `20260709000000_dynamic_product_categories` do thiếu kiểu `ProductCategory` nền; thử nghiệm dùng `prisma db push` chỉ trên database rỗng riêng. Không suy ra rằng migration trên production an toàn từ thử nghiệm này.

[Tổng quan](../../PROJECT_OVERVIEW.md) · [Kiến trúc](architecture.md)

Repo khai báo Dockerfile Node 20 Alpine đa giai đoạn, Next standalone và Prisma CLI; Compose khai báo app, PostgreSQL 16, Nginx, cron và Certbot. PostgreSQL dùng volume được đặt tên; không giả định database local và production giống nhau.

Workflow `.github/workflows/deploy.yml` chạy typecheck/build, push image GHCR theo SHA và SSH tới VPS khi push main. Bước deploy kiểm tra tracked changes, fetch/checkout commit, gọi `scripts/deploy-vps.sh`. Script pull image, backup, migrate, thay container và chờ health; rollback chỉ là app image, không phục hồi DB. `scripts/backup.sh` dùng pg_dump/gzip, kiểm tra gzip và dọn backup cũ theo retention; gzip hợp lệ không chứng minh restore thành công.

Workflow và `scripts/cleanup-docker-vps.sh` dọn cache/image; thao tác có thể ảnh hưởng Docker dùng chung host. Cleanup sau khi app healthy có thể làm job báo thất bại dù app mới đã chạy. Migration có thể không tương thích image cũ. Nginx tham chiếu `inventory-mcp` không thấy khai báo trong Compose; phụ thuộc môi trường thực tế.

Các nội dung này là cấu hình repo, không xác minh trạng thái VPS, secrets, restore, network hoặc monitoring hiện hành. Không chạy deploy, restart, cleanup, migration hoặc restore production khi chưa có yêu cầu và đánh giá phù hợp.
