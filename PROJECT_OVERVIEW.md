# Tổng quan dự án STEP IT Warehouse

Bộ chỉ mục AI: [kiến trúc](docs/ai-context/architecture.md), [module](docs/ai-context/modules.md), [database](docs/ai-context/database.md), [API](docs/ai-context/api.md), [triển khai](docs/ai-context/deployment.md), [convention](docs/ai-context/conventions.md). Các tài liệu này là bổ sung theo tiến độ khảo sát, chưa thay thế việc đọc mã.

Kiểm tra handover: chỉ mục API khớp tĩnh 42 file route và method export tại thời điểm kiểm tra; liên kết Markdown và đường dẫn source tường minh trong tài liệu hiện tồn tại. Đây không phải kiểm thử contract hoặc bảo đảm mọi nhánh đã được khảo sát. Trạng thái bàn giao: sẵn sàng định hướng ban đầu nhưng còn giới hạn; xem phần chưa xác minh ở cuối tài liệu.

> Trạng thái khảo sát: **chưa hoàn tất**. Đây là bản ghi tiến độ dựa trên mã đã kiểm tra, không phải kiểm toán toàn diện. Trước khi thay đổi, tiếp tục đọc các tệp và luồng liên quan. Không suy ra trạng thái production từ cấu hình trong repository.

## Phạm vi khảo sát

Đã lập danh mục 189 tệp được `rg --files --hidden` tìm thấy, loại `.git`, `.history`, `node_modules`, `.next` và tên tệp môi trường; gồm 42 route API, 20 tệp trang/component dưới dashboard, 10 migration SQL và 5 tài nguyên public. Đây là **số tệp trong danh mục, không phải số tệp đã đọc đầy đủ**. Đã đọc nội dung schema, xác thực, proxy, Compose, Dockerfile, Nginx, workflow, script deploy/backup/cleanup/cron, health, thuê, bàn giao, API lắp/tháo cũ, category, dịch vụ giám sát và API gợi ý Hermes; đã tìm kiếm có mục tiêu trong các route, trang và migration khác. Chưa đọc đầy đủ toàn bộ 189 tệp. `AGENTS.md` và tài liệu này đã tồn tại nhưng chưa được Git theo dõi khi bắt đầu.

## Mục đích, công nghệ và cấu trúc

Ứng dụng quản lý kho thiết bị IT theo sản phẩm, serial, vị trí, lắp ráp, thuê và bàn giao. `package.json` xác định Next.js 16 App Router, React 19, TypeScript, Prisma 6/PostgreSQL, NextAuth Credentials/bcrypt, Tailwind 4, Radix, ExcelJS/xlsx-js-style, QR, Recharts, Nodemailer và date-fns.

- `app/(auth)` và `app/(dashboard)`: login và các trang dashboard, tài sản, sản phẩm, kho, rack, lắp ráp, thuê, bàn giao, quét, lịch sử, người dùng.
- `app/api`: 42 route handler, gồm auth, dashboard, assets/import/export/restore, assembly, product taxonomy/attributes, kho/rack, rental, handover, history, users, AI, cron, Telegram và health.
- `components`: UI theo nghiệp vụ, layout và primitives; `context` quản lý sidebar; session provider bọc ứng dụng. Client dùng local React state và `fetch`; chưa xác minh toàn bộ state của mọi trang.
- `lib`: Prisma singleton, quy tắc asset/rack/slot, validation, helper UI/API và các dịch vụ email, Telegram, cảnh báo thuê, Hermes.
- `prisma`: schema, seed, backfill và 10 migration; `scripts`, `docker`, `.github/workflows`, `nginx`: vận hành. `.history` là các bản sao lịch sử, chưa xác minh cách sử dụng; `prisma.config.ts.backup` là tệp backup theo tên, chưa xác minh nguồn gốc. Không coi chúng là code chạy chỉ dựa vào tên.
- `README.md` là hướng dẫn Next.js mặc định; `HUONG_DAN_SU_DUNG.md`, `Operational_Scenarios.md`, `CI_CD.md`, `deloy.md` cung cấp hướng dẫn nghiệp vụ/vận hành nhưng cần đối chiếu mã hiện tại. Chưa đọc đầy đủ các tài liệu này.

## Kiến trúc và luồng chính

Trình duyệt → trang/component App Router → `fetch` tới route handler cùng ứng dụng → Prisma → PostgreSQL. Route handler thường tự validate, dùng `NextResponse`, try/catch và transaction; chưa thấy một tầng repository chung trong các luồng đã đọc. Nhiều thao tác ghi `StockMovement` trong transaction. Một số API có response `{ data }`, một số trả trực tiếp mảng/object; không giả định một contract thống nhất.

1. Đăng nhập: Credentials tìm username, bcrypt so mật khẩu, kiểm tra `isActive`; JWT lưu id/username/role, session truyền ra client. `proxy.ts` bảo vệ các đường dẫn ngoại trừ login, auth và health. `/users` kiểm tra ADMIN phía server; sidebar/mobile ẩn mục theo role. Kiểm tra quyền cụ thể vẫn phải thực hiện ở từng API.
2. Sản phẩm: danh mục động, định nghĩa thuộc tính và lựa chọn; Product có modelNumber duy nhất và JSON attributes. GET category có thể tự tạo danh mục mặc định khi bảng rỗng. API Hermes gợi ý thông số theo schema danh mục; ứng dụng chuẩn hóa dữ liệu trả về, có timeout và token tùy cấu hình.
3. Tài sản: serial duy nhất; lọc, nhập Excel, xuất báo cáo, in/scan QR, vị trí kho/rack, trạng thái và cây cha/con. Xóa mềm lưu snapshot vị trí/trạng thái để phục hồi; có API xóa vĩnh viễn ADMIN. Asset cha di chuyển có cập nhật vị trí con trong route chỉnh sửa. Quy tắc slot và rack cần xem cùng `lib/server-slots.ts`, `lib/rack-utils.ts`, `lib/asset-status-rules.ts` khi sửa.
4. Lắp ráp: UI gọi `/api/assembly`, có nhánh giao dịch; vẫn tồn tại `/api/assets/assemble`, `/disassemble` và `/move-component`. Chưa chứng minh hai endpoint cũ không có client bên ngoài, không tự xóa. UI chuyển linh kiện có thể thực hiện tháo và lắp qua hai request; cần kiểm tra trạng thái trung gian khi lỗi.
5. Thuê: POST tạo contract ACTIVE và đổi asset IN_STOCK sang RENTED trong transaction; trả thuê đổi contract RETURNED và asset IN_STOCK. Dịch vụ giám sát quét ACTIVE, gửi email/Telegram theo mốc 14/7/3/1 ngày và quá hạn; cờ gửi được cập nhật nếu ít nhất một kênh thành công. Service không chuyển contract sang EXPIRED trong mã đã đọc.
6. Bàn giao: tạo record/items, đổi asset HANDED_OVER và owner, ghi movement; trả đổi record RETURNED, khôi phục owner trước đó và đặt từng asset IN_STOCK. Các validation được thực hiện trước transaction. Lịch sử dùng StockMovement.

## Dữ liệu và migration

`prisma/schema.prisma` có 12 model: ProductCategory → ProductAttributeDefinition → ProductAttributeOption; Product thuộc category; Asset thuộc Product/Warehouse, có Rack tùy chọn và quan hệ tự tham chiếu parent/components; Asset liên kết StockMovement, RentalContract và HandoverItem; HandoverRecord thuộc User và có nhiều item; movement gắn actor và target user tùy chọn. Unique trên serial, model, username, mã biên bản và mã category. Asset lưu snapshot xóa mềm; quan hệ snapshot là string, không phải foreign key.

10 migration hiện có chủ yếu cập nhật category động, trạng thái component, snapshot, thuộc tính động và slot; migration đầu tham chiếu các bảng đã có từ trước. Chưa xác minh baseline, lịch sử migration hoặc khả năng dựng database rỗng. Các truy vấn asset theo trạng thái, parent, rack, deletedAt và hợp đồng theo trạng thái cần đo với dữ liệu thực tế: schema không khai báo index riêng trên các cột này. Một số danh sách như rental và handover tải toàn bộ kết quả; đánh giá phân trang và query plan trước tối ưu.

## Tích hợp và vận hành

- Hermes: `HERMES_API_URL`, token tùy chọn và timeout; có mock trong `scripts/mock-hermes.js`. Chưa xác minh dịch vụ ngoài.
- SMTP và Telegram: thông báo thuê; webhook xử lý command qua `lib/telegram-bot-service.ts`. Không xác minh webhook đã đăng ký hoặc đang hoạt động.
- Không thấy cấu hình Redis, queue hay WebSocket trong Compose và các phần đã đọc; chưa loại trừ hoàn toàn ở các tệp chưa đọc. Import nhận Excel và export sinh báo cáo; chưa xác minh storage ngoài.
- Lệnh: `npm run dev`, `npm run build`, `npm start`, `npm run lint`, `npm run mock:hermes`; không có script test trong `package.json`. Chưa chạy build, lint, typecheck hay test trong đợt khảo sát này.

## Docker và CI/CD

Dockerfile Node 20 Alpine đa giai đoạn: `npm ci`, Prisma generate, Next build standalone; runtime non-root, copy Prisma và toàn bộ node_modules. Compose khai báo PostgreSQL 16 với volume, app, Nginx 80/443, cron Alpine và Certbot; app nối public/private, DB và cron nối private nội bộ. App health kiểm tra `SELECT 1`; log Docker json-file có giới hạn, cron ghi file trên volume. Không thấy hệ thống monitoring tập trung trong cấu hình đã đọc. Certbot renew định kỳ; chưa xác minh reload Nginx sau gia hạn.

Workflow `.github/workflows/deploy.yml`: PR vào main cài dependency, generate Prisma, `tsc --noEmit`, build image không push; push main hoặc workflow_dispatch build/push GHCR theo SHA, sau đó SSH đến VPS, cleanup Docker trước deploy, login GHCR, kiểm tra tracked changes, fetch/checkout đúng commit, gọi `scripts/deploy-vps.sh`. Script khóa deploy, pull image, `scripts/backup.sh` chạy pg_dump gzip và kiểm tra gzip, migrate deploy rồi recreate app và chờ healthy. Khi start/health lỗi script thử image cũ, **không tự restore DB**. Backup mặc định giữ 7 ngày và tự xóa file cũ. Cleanup sau deploy xóa build cache và image không dùng, giữ image hiện tại/trước đó theo tên; có thể tác động cache/image Docker dùng chung host. Deploy thay một app container nên có thể gián đoạn; schema đã migrate có thể không tương thích image rollback. Không kiểm tra VPS thực tế, lịch backup ngoài deploy, khôi phục hoặc cấu hình secrets.

Environment được truyền qua Compose và GitHub secrets; chỉ ghi tên biến, không đọc giá trị. Nginx cấu hình HTTPS và HTTP mặc định; `/mcp` và `/health` proxy tới `inventory-mcp`, nhưng Compose trong repo không khai báo service này. Cần xác minh dịch vụ/network thực tế và khả năng Nginx khởi động trước khi triển khai. `deloy.md` có các hướng dẫn thủ công có thể không đồng bộ workflow, cần đối chiếu trước khi dùng.

## Code review sơ bộ

Mức độ phản ánh rủi ro tiềm năng theo mã, không khẳng định đã xảy ra trong production. Chưa có phát hiện Critical được xác minh; không có nghĩa hệ thống không có lỗi Critical.

### High

- **Cron và webhook bị chặn ở proxy:** `proxy.ts`, `docker/cron-worker.sh`, `docker-compose.yml`, `app/api/cron/rental-monitor/route.ts`, `app/api/telegram/webhook/route.ts`. Matcher chỉ miễn login/auth/health, worker dùng wget không có session hoặc Bearer, Compose không truyền CRON_SECRET cho worker. Theo cấu hình, cron không thể đi qua cả proxy và kiểm tra secret khi bật secret; Telegram cũng không có session. Cảnh báo/lệnh có thể không chạy. Đề xuất miễn đúng route, xác thực machine-to-machine fail-closed và kiểm thử end-to-end; webhook phải xác minh secret và chat được phép.
- **Trả thuê lặp làm sai trạng thái:** `app/api/rentals/return/route.ts`. Update contract theo id không kiểm tra trạng thái hiện tại rồi luôn đặt asset IN_STOCK; gửi lại request cũ sau khi asset đã cho thuê lại/bàn giao có thể làm sai tồn kho. Đề xuất kiểm tra trạng thái hợp đồng và asset bằng cập nhật có điều kiện trong transaction, xử lý xung đột/idempotency.
- **Cạnh tranh tạo bàn giao/thuê:** `app/api/handovers/route.ts`, `app/api/rentals/route.ts`, `prisma/schema.prisma`. Bàn giao đọc/kiểm tra asset trước transaction rồi update vô điều kiện; thuê đọc rồi ghi trong transaction mà không có ràng buộc duy nhất hợp đồng hoạt động hoặc điều kiện update theo trạng thái. Request đồng thời có thể cùng nhận asset, ghi nhận chồng chéo. Mã biên bản count+1 cũng có race gây lỗi unique. Cần khóa/điều kiện cập nhật nguyên tử, kiểm thử cạnh tranh, thiết kế mã an toàn.
- **Rollback image không rollback schema:** `scripts/deploy-vps.sh`, `scripts/backup.sh`. Migration chạy khi app cũ còn hoạt động; rollback chỉ đổi image và backup gzip chưa chứng minh restore được. Migration không tương thích có thể gây lỗi hoặc downtime; dùng migration tương thích hai chiều, diễn tập restore và lập kế hoạch downtime.
- **Nginx phụ thuộc upstream không có trong Compose:** `nginx/nginx.conf`, `docker-compose.yml`. Tên `inventory-mcp` được dùng trực tiếp trong proxy_pass nhưng không khai báo service; nếu không được DNS/network bên ngoài cung cấp, Nginx có thể không khởi động, ảnh hưởng toàn site. Xác minh môi trường và quản lý dependency cấu hình rõ ràng.

### Medium

- **Phiên không thu hồi khi đổi quyền/vô hiệu hóa:** `app/api/auth/[...nextauth]/route.ts`. JWT chứa role lúc login, thời hạn 30 ngày, không đọc lại user trong callback. Các route dựa vào role JWT vẫn có thể chấp nhận quyền cũ; kiểm tra user active/role phía server hoặc cơ chế thu hồi phiên.
- **Quyền chưa nhất quán:** `app/api/product-categories/route.ts`, `app/api/assets/[id]/restore/route.ts`, `app/api/assets/recycle-bin/route.ts`, `app/api/users/route.ts`. Các route này dựa vào proxy hoặc session nhưng không kiểm tra ADMIN cho những hành động tương ứng; UI ẩn chức năng không tạo ranh giới quyền. Xác định ma trận quyền nghiệp vụ, kiểm tra server-side và test theo role; chưa kết luận mọi thao tác này bắt buộc ADMIN khi chưa có chính sách được xác nhận.
- **Định danh actor theo tên không duy nhất:** `app/api/handovers/route.ts`, `app/api/assets/assemble/route.ts` và các route tương tự tìm user qua name hoặc username thay vì id trong session. Hai user trùng tên có thể gây ghi lịch sử sai actor. Dùng session.user.id và kiểm tra user hiện hành.
- **Linh kiện trả bàn giao:** `app/api/handovers/[id]/return/route.ts` đặt mọi asset IN_STOCK kể cả component vẫn có parentId, trong khi các đường lắp ráp dùng INSTALLED. Có thể vi phạm quy ước trạng thái; cần xác định trạng thái theo quan hệ và kiểm thử bàn giao nguyên server.
- **Cảnh báo theo kênh không độc lập:** `lib/rental-alert-service.ts`. Chỉ một cờ cho cả email và Telegram; một kênh thành công khiến kênh thất bại không được thử lại tại mốc đó. Dùng trạng thái/kế hoạch retry riêng cho từng kênh. Không chuyển ACTIVE sang EXPIRED, nên bộ lọc EXPIRED phụ thuộc nguồn cập nhật khác chưa thấy trong service.
- **Cleanup làm job deploy thất bại sau khi app đã đổi:** `scripts/deploy-vps.sh`, `scripts/cleanup-docker-vps.sh`. Cleanup sau health có thể exit 20 vì thiếu dung lượng; pipeline báo thất bại dù release đã chạy. Tách kết quả deploy/cleanup và cảnh báo rõ ràng; chú ý cleanup trước deploy trong workflow cũng tác động tài nguyên host.
- **Phân trang và index:** `app/api/rentals/route.ts`, `app/api/handovers/route.ts`, `prisma/schema.prisma`. Danh sách tải toàn bộ và các cột lọc asset/contract thiếu index tường minh; có thể chậm khi dữ liệu tăng. Đo query plan, thêm phân trang/index phù hợp sau khi đo.

### Low

- **Logic lắp/tháo trùng:** `app/api/assembly/route.ts`, `app/api/assets/assemble/route.ts`, `app/api/assets/disassemble/route.ts`. Nhiều endpoint cùng thao tác nhưng validation và xử lý slot khác nhau; có nguy cơ lệch quy tắc. Xác minh mọi consumer trước khi hợp nhất; tìm kiếm tĩnh chưa thấy UI gọi hai route assemble/disassemble cũ, không chứng minh dead code.
- **GET category có side effect:** `app/api/product-categories/route.ts` tự seed nếu bảng rỗng. Gây bất ngờ khi đọc và khó kiểm soát khởi tạo; chuyển sang migration/seed có chủ đích sau khi xác minh môi trường.
- **Tài liệu triển khai có nguy cơ lỗi thời:** `deloy.md`, `.github/workflows/deploy.yml`, `docker/entrypoint.sh`. Tài liệu mô tả quy trình thủ công khác workflow hiện tại; đối chiếu và cập nhật sau khi xác minh thực tế.

## Chưa xác minh và bước tiếp theo

Tiếp tục đọc toàn bộ route còn lại, toàn bộ component/page, helper, 10 migration SQL, seed/backfill, script còn lại và tài liệu; lập bảng endpoint/quyền/validation/transaction, kiểm thử các bất biến rack, slot, import, restore, concurrent requests. Rà soát dependency và graph import trước khi kết luận dead code; chưa có kết luận dependency không dùng. Kiểm tra baseline migration trên database thử nghiệm độc lập, backup/restore, Nginx và cron bằng môi trường cô lập khi được phép. Chưa chạy hệ thống, truy cập VPS, database, Docker hay dịch vụ ngoài; không đọc secrets. Không khẳng định đã hiểu toàn bộ dự án.
