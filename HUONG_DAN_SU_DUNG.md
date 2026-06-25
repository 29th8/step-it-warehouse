# Tài liệu Hướng dẫn Sử dụng & Vận hành
# Hệ thống Quản lý Kho Thiết bị IT — STEP IT

---

## MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Đăng nhập & Phân quyền](#2-đăng-nhập--phân-quyền)
3. [Dashboard](#3-dashboard)
4. [Quản lý Sản phẩm](#4-quản-lý-sản-phẩm)
5. [Quản lý Thiết bị](#5-quản-lý-thiết-bị)
6. [Quản lý Vị trí & Kho](#6-quản-lý-vị-trí--kho)
7. [Quản lý Tủ Rack](#7-quản-lý-tủ-rack)
8. [Lắp ráp Thiết bị](#8-lắp-ráp-thiết-bị)
9. [Biên bản Bàn giao](#9-biên-bản-bàn-giao)
10. [Lịch sử Hệ thống](#10-lịch-sử-hệ-thống)
11. [Quét mã QR](#11-quét-mã-qr)
12. [Quản trị Tài khoản](#12-quản-trị-tài-khoản)
13. [Vận hành & Bảo trì Server](#13-vận-hành--bảo-trì-server)
14. [Xử lý sự cố thường gặp](#14-xử-lý-sự-cố-thường-gặp)

---

## 1. Tổng quan hệ thống

Hệ thống quản lý kho thiết bị IT của STEP IT giúp theo dõi toàn bộ vòng đời thiết bị: từ khi nhập kho, lắp ráp, bàn giao, đến khi thanh lý.

**Các tính năng chính:**
- Quản lý danh mục sản phẩm và thiết bị theo serial number
- Theo dõi trạng thái và vị trí vật lý của từng thiết bị
- Lắp ráp linh kiện vào server, di chuyển và tháo rời
- Tạo và in biên bản bàn giao vật tư
- Ghi nhận lịch sử mọi thao tác
- Quét mã QR để tra cứu nhanh

**Công nghệ:** Next.js 16, PostgreSQL, Prisma ORM

---

## 2. Đăng nhập & Phân quyền

### Đăng nhập
Truy cập URL hệ thống → nhập **Tên đăng nhập** và **Mật khẩu** → nhấn **Đăng nhập**.

### Phân quyền

| Quyền | ADMIN | USER |
|-------|-------|------|
| Xem tất cả thiết bị | ✅ | ✅ |
| Thêm / sửa thiết bị | ✅ | ✅ |
| Tạo biên bản bàn giao | ✅ | ✅ |
| Lắp ráp / tháo linh kiện | ✅ | ✅ |
| Xóa thiết bị (Recycle Bin) | ✅ | ✅ |
| Xóa vĩnh viễn | ✅ | ❌ |
| Quản lý tài khoản người dùng | ✅ | ❌ |
| Tạo / xóa kho, rack | ✅ | ❌ |

> **Lưu ý:** Menu **Tài khoản** chỉ hiển thị với ADMIN.

---

## 3. Dashboard

Trang chủ hiển thị tổng quan nhanh:
- **Tổng thiết bị** trong hệ thống
- **Phân bổ theo trạng thái** (Trong kho, Đang sử dụng, Đã bàn giao, Bảo trì...)
- **Phân bổ theo danh mục** (Server, RAM, Ổ cứng, CPU...)
- **Hoạt động gần đây** — các thao tác được ghi log mới nhất

---

## 4. Quản lý Sản phẩm

**Đường dẫn:** Menu → **Sản phẩm**

Sản phẩm là **mẫu/model** thiết bị (ví dụ: HPE DL360 GEN10, RAM ECC DDR4 32GB). Mỗi thiết bị thực tế (asset) phải liên kết với một sản phẩm.

### Danh mục sản phẩm (Category)

| Category | Ý nghĩa |
|----------|---------|
| SERVER | Máy chủ |
| MEMORY | RAM |
| STORAGE | Ổ cứng (SSD/HDD) |
| CPU | Vi xử lý |
| GPU | Card đồ họa |
| NETWORK | Thiết bị mạng, card mạng |
| ACCESSORY | Phụ kiện khác |

### Thêm sản phẩm mới
1. Nhấn **+ Thêm sản phẩm**
2. Điền: Tên, Model Number, Category, Vendor (hãng sản xuất)
3. Với RAM: thêm thế hệ (DDR4/DDR5), dung lượng
4. Với Storage: thêm loại (SSD/HDD), dung lượng, giao tiếp (SATA/NVMe/SAS)
5. Nhấn **Lưu**

> Sản phẩm là dữ liệu gốc — không xóa sản phẩm đang có thiết bị liên kết.

---

## 5. Quản lý Thiết bị

**Đường dẫn:** Menu → **Thiết bị**

### 5.1 Giao diện danh sách

Thiết bị được chia thành 2 tab:
- **Thiết bị** — Server, thiết bị mạng (NETWORK)
- **Linh kiện** — RAM, ổ cứng, CPU, GPU, phụ kiện

Mỗi tab có **badge số lượng** và phân trang riêng (50 thiết bị/trang).

### 5.2 Bộ lọc & Tìm kiếm

| Bộ lọc | Mô tả |
|--------|-------|
| Tìm kiếm | Serial Number, tên thiết bị, model |
| Trạng thái | Trong kho, Đang sử dụng, Đã bàn giao... |
| Lọc Nâng cao | Lọc theo danh mục, thế hệ RAM, dung lượng... |
| Chủ sở hữu | Lọc theo tên người/bộ phận đang giữ |

> Khi chọn lọc **Server** → tab Linh kiện tự động hiển thị 0 (và ngược lại).

### 5.3 Trạng thái thiết bị

| Trạng thái | Màu | Ý nghĩa |
|-----------|-----|---------|
| Trong kho | Xanh lá | Đang lưu tại kho, sẵn sàng sử dụng |
| Đã giữ | Vàng | Đã đặt chỗ, chờ xuất |
| Đang sử dụng | Xanh dương | Đang được dùng, chưa có biên bản |
| Đã bàn giao | Tím | Đã có biên bản bàn giao chính thức |
| Đang bảo trì | Vàng | Đang sửa chữa/bảo dưỡng |
| Hỏng | Đỏ | Thiết bị lỗi, không dùng được |
| Đang cho thuê | Xanh cyan | Đang trong hợp đồng cho thuê |
| Thanh lý | Xám | Đã thanh lý, không còn sử dụng |

### 5.4 Thêm thiết bị mới

1. Nhấn **+ Thêm Thiết bị**
2. Điền thông tin:
   - **Sản phẩm/Model** — tìm kiếm và chọn từ danh sách
   - **Mã Serial (SN)** — bắt buộc, duy nhất trong hệ thống
   - **Trạng thái** — mặc định: Trong kho
   - **Chủ sở hữu** — người/bộ phận đang giữ (nếu có)
   - **Vị trí Kho** — chọn kho lưu trữ
   - **Tủ Rack** — nếu đặt trên rack, chọn rack và vị trí U
3. Nhấn **Thêm**

> Serial Number tự động chuyển thành CHỮ HOA khi lưu.

### 5.5 Xem chi tiết & Chỉnh sửa

Nhấn **···** (3 chấm) ở cuối mỗi hàng → chọn **Xem chi tiết**.

Trong màn hình chi tiết:
- Xem thông tin đầy đủ: sản phẩm, serial, trạng thái, vị trí, chủ sở hữu
- Xem **linh kiện gắn kèm** (nếu là server) — nhóm theo CPU / RAM / Ổ cứng
- Xem **lịch sử thao tác** của thiết bị
- Nhấn **Chỉnh sửa** để cập nhật thông tin

**Trong form chỉnh sửa:**
- **Thiết bị cha** — chọn server để lắp linh kiện nhanh (không cần vào trang Lắp ráp)
- Tìm theo serial hoặc tên server trong ô tìm kiếm

### 5.6 Import hàng loạt từ Excel

1. Nhấn **Import Excel**
2. Tải file mẫu về (nút **Tải mẫu**)
3. Điền dữ liệu vào file mẫu (Serial, Product ID, Warehouse ID...)
4. Upload file và nhấn **Import**

### 5.7 Export danh sách

Nhấn **Export** → tải file Excel/CSV chứa toàn bộ thiết bị hiện tại.

### 5.8 Thùng rác (Recycle Bin)

Thiết bị bị xóa sẽ vào **Thùng rác** (nhấn icon 🗑️ đỏ).
- Có thể **Khôi phục** thiết bị đã xóa
- **Xóa vĩnh viễn** — chỉ ADMIN, không thể hoàn tác

---

## 6. Quản lý Vị trí & Kho

**Đường dẫn:** Menu → **Vị trí**

Kho là nơi lưu trữ vật lý thiết bị (ví dụ: Kho STEP, Data Center VNPT).

### Thêm kho mới (ADMIN)
1. Nhấn **+ Thêm kho**
2. Điền tên kho, mô tả
3. Nhấn **Lưu**

### Sử dụng
- Mỗi thiết bị phải được gán vào một kho
- Khi di chuyển thiết bị sang kho khác → hệ thống tự ghi log lịch sử

---

## 7. Quản lý Tủ Rack

**Đường dẫn:** Menu → **Tủ Rack**

Quản lý các tủ rack trong datacenter.

### Loại rack
- **DATACENTER** — tủ có số U cụ thể (ví dụ: 42U), kiểm soát vị trí từng thiết bị
- **STORAGE** — tủ lưu trữ thông thường, không chia U

### Xem chi tiết rack
Nhấn vào tên rack → xem **sơ đồ U** trực quan, thiết bị nào đang chiếm vị trí nào.

### Đặt thiết bị lên rack
Khi thêm/sửa thiết bị: chọn **Tủ Rack** → nhập **Vị trí U** và **Chiều cao (U)**.

> Hệ thống tự kiểm tra trùng lặp vị trí U — không cho phép 2 thiết bị chiếm cùng 1 vị trí.

---

## 8. Lắp ráp Thiết bị

**Đường dẫn:** Menu → **Lắp ráp**

Trang này quản lý việc lắp linh kiện vào server và tháo ra.

### 8.1 Cột trái — Thiết bị lắp ráp
Danh sách các server. Tìm kiếm theo tên, serial, chủ sở hữu.

### 8.2 Cột phải — Cấu hình hiện tại
Hiển thị linh kiện đang lắp trong từng server, nhóm theo:
- Vi xử lý (CPU) — màu xanh dương
- RAM — màu tím
- Ổ cứng — màu cam
- Card đồ họa — màu xanh lá
- Card mạng — màu cyan
- Phụ kiện — màu xám

**Checkbox theo nhóm:** Click vào header nhóm (VD: "RAM") để chọn tất cả RAM trong server đó.

### 8.3 Lắp linh kiện vào server
1. Nhấn **Lắp ráp** ở server cần lắp
2. Popup hiển thị danh sách linh kiện đang Trong kho (popup kích thước cố định)
3. Dùng bộ lọc: Category, Kho, thế hệ RAM, dung lượng...
4. Tick chọn linh kiện cần lắp
5. Nhấn **Lắp ráp (N) linh kiện**

> Hoặc: vào **Chỉnh sửa** thiết bị → chọn **Thiết bị cha** để lắp nhanh.

### 8.4 Tháo linh kiện
- **Tháo từng cái:** Nhấn **Tháo** ở linh kiện đó
- **Tháo theo nhóm:** Tick chọn nhiều linh kiện → nhấn **Tháo (N)**
- **Tháo tất cả:** Nhấn **Tháo rời toàn bộ (N linh kiện)**

Linh kiện sau khi tháo sẽ trở về trạng thái **Trong kho**.

### 8.5 Di chuyển linh kiện sang server khác
1. Tick chọn linh kiện → nhấn **Di chuyển (N)**
2. Chọn server đích trong dropdown
3. Nhấn **Di chuyển**

---

## 9. Biên bản Bàn giao

**Đường dẫn:** Menu → **Bàn giao**

Quản lý việc xuất vật tư/thiết bị ra ngoài kho có xác nhận ký tên.

### 9.1 Tạo biên bản mới

1. Nhấn **+ Tạo Biên bản mới**
2. Điền thông tin:
   - **Người nhận** *(bắt buộc)*
   - **Bộ phận** *(bắt buộc)*
   - **Mục đích sử dụng** *(bắt buộc)*
   - **Người duyệt / Sếp ký** *(bắt buộc)*
   - **Ngày bàn giao** — mặc định hôm nay
   - **Ngày dự kiến trả** — nếu là mượn tạm
   - **Ghi chú** — tùy chọn
3. Tìm và chọn thiết bị bàn giao:
   - Gõ vào ô tìm kiếm (Serial Number hoặc tên)
   - **Chọn Server** → tự động thêm toàn bộ linh kiện đang lắp trong server đó
   - Linh kiện con hiển thị thụt lề dưới server cha
   - Nhấn ✕ ở server để xóa cả nhóm (server + linh kiện)
4. Nhấn **Tạo & In Biên bản**

**Sau khi tạo:**
- Hệ thống tự sinh mã: `BBG-YYYYMMDD-0001`
- Trạng thái thiết bị → **Đã bàn giao** (badge tím)
- Chủ sở hữu → `{Bộ phận} - {Người nhận}`
- Popup xem trước biên bản → nhấn **In / Xuất PDF**

### 9.2 In lại biên bản

Trong danh sách → nhấn icon 🖨️ ở biên bản cần in.

### 9.3 Xác nhận hoàn trả

Khi thiết bị được trả lại kho:
1. Tìm biên bản trạng thái **Đang mang đi**
2. Nhấn **Xác nhận trả**
3. Xác nhận trong hộp thoại

**Sau khi xác nhận trả:**
- Trạng thái biên bản → **Đã hoàn trả**
- Trạng thái thiết bị → **Trong kho**
- Chủ sở hữu → **khôi phục về chủ sở hữu cũ** (trước khi bàn giao)

### 9.4 Bộ lọc biên bản

| Bộ lọc | Giá trị |
|--------|---------|
| Tất cả | Hiển thị tất cả |
| Đang mang đi | Biên bản chưa hoàn trả |
| Đã hoàn trả | Biên bản đã trả xong |

---

## 10. Lịch sử Hệ thống

**Đường dẫn:** Menu → **Lịch sử hệ thống**

Ghi lại toàn bộ thao tác trong hệ thống:

| Loại hành động | Ý nghĩa |
|----------------|---------|
| IMPORT | Nhập kho thiết bị mới |
| TRANSFER | Di chuyển / thay đổi vị trí |
| ASSEMBLE | Lắp linh kiện vào server |
| DISASSEMBLE | Tháo linh kiện khỏi server |
| HANDOVER | Bàn giao theo biên bản |
| HANDOVER_RETURN | Hoàn trả từ biên bản |
| DELETE | Xóa thiết bị |
| RESTORE | Khôi phục thiết bị |

Có thể lọc theo: **Loại hành động**, **Người thực hiện**, **Khoảng thời gian**.

---

## 11. Quét mã QR

**Đường dẫn:** Menu → **Quét QR** (hoặc truy cập `/scan`)

> ⚠️ **Lưu ý quan trọng:** Tính năng này chỉ hoạt động khi quét **tem QR do hệ thống tạo ra** (từ nút **In Tem** trong trang Thiết bị). Quét bằng app camera thông thường chỉ đọc được chuỗi Serial Number — **không hiển thị thông tin thiết bị**.

### Cách hoạt động

Mã QR trên tem chứa **Serial Number** của thiết bị. Khi quét qua trang `/scan` của hệ thống, app sẽ tra cứu serial đó trong database và hiển thị thông tin.

**Phải dùng đúng cách:**
1. Mở trình duyệt (Chrome/Safari) trên điện thoại hoặc máy tính
2. Truy cập đúng địa chỉ hệ thống → vào menu **Quét QR**
3. Cho phép trình duyệt truy cập camera
4. Hướng camera vào mã QR trên tem → hệ thống tự tìm và hiển thị

**Hoặc nhập thủ công** (không cần camera): Gõ Serial Number vào ô tìm kiếm → nhấn **Tìm**.

### Thông tin hiển thị sau khi tra cứu thành công

- Tên sản phẩm & Serial Number
- Trạng thái hiện tại (Trong kho / Đang dùng...)
- Kho lưu trữ & vị trí Rack
- Chủ sở hữu (nếu có)
- Thiết bị cha (nếu đang lắp trong server)

### Cập nhật trạng thái nhanh

- ✅ Đang dùng
- ✅ Vào kho
- ✅ Bảo trì
- ✅ Báo lỗi

---

## 12. Quản trị Tài khoản

**Đường dẫn:** Menu → **Tài khoản** *(chỉ ADMIN)*

### Tạo tài khoản mới
1. Nhấn **+ Thêm tài khoản**
2. Điền: Tên đăng nhập, Mật khẩu, Họ tên, Phân quyền (ADMIN/USER)
3. Nhấn **Tạo**

### Quản lý tài khoản
- **Đặt lại mật khẩu** — khi người dùng quên mật khẩu
- **Khóa tài khoản** — tạm thời vô hiệu hóa, không cho đăng nhập
- **Kích hoạt lại** — mở khóa tài khoản
- **Xóa tài khoản** — xóa vĩnh viễn (không thể hoàn tác)

> Không thể xóa hoặc khóa tài khoản đang đăng nhập.

---

## 13. Vận hành & Bảo trì Server

### Yêu cầu hệ thống
- **Node.js** >= 18
- **PostgreSQL** >= 14
- **RAM** >= 1GB
- **Disk** >= 10GB

### Khởi động ứng dụng

```bash
# Cài dependencies (lần đầu)
npm install

# Đồng bộ database schema
npx prisma db push

# Build production
npm run build

# Chạy production
npm start

# Hoặc dùng PM2
pm2 start npm --name "step-warehouse" -- start
pm2 save
```

### Cập nhật phiên bản mới

```bash
# Pull code mới
git pull origin main

# Cài dependencies mới (nếu có)
npm install

# Cập nhật schema database
npx prisma db push --accept-data-loss

# Regenerate Prisma client
npx prisma generate

# Build lại
npm run build

# Restart server
pm2 restart step-warehouse
```

### Biến môi trường (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/warehouse_db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-domain.com"
```

### Backup database

```bash
# Backup
pg_dump warehouse_db > backup_$(date +%Y%m%d).sql

# Restore
psql warehouse_db < backup_20260615.sql
```

### Kiểm tra logs

```bash
# PM2 logs
pm2 logs step-warehouse

# Xem 100 dòng gần nhất
pm2 logs step-warehouse --lines 100
```

---

## 14. Xử lý sự cố thường gặp

### Lỗi "Thiết bị không ở trạng thái Trong kho"
**Nguyên nhân:** Khi tạo biên bản bàn giao, có thiết bị không phải `IN_STOCK` và không phải linh kiện con của server được chọn.
**Xử lý:** Kiểm tra trạng thái từng thiết bị trong danh sách đã chọn. Chỉ có thể bàn giao thiết bị đang **Trong kho** hoặc linh kiện **lắp trong server** cũng được bàn giao.

### Lỗi "Serial Number đã tồn tại"
**Nguyên nhân:** Serial Number bị trùng với thiết bị đã có trong hệ thống (kể cả thiết bị trong thùng rác).
**Xử lý:** Kiểm tra thùng rác — nếu có thiết bị cũ bị xóa cùng serial, cần xóa vĩnh viễn trước.

### Lỗi "Vị trí U bị chiếm"
**Nguyên nhân:** Đặt thiết bị vào vị trí U đã có thiết bị khác trên rack DATACENTER.
**Xử lý:** Xem sơ đồ rack (Tủ Rack → nhấn vào tên rack) để chọn vị trí trống.

### Tab thiết bị/linh kiện hiển thị sai số
**Nguyên nhân:** Có thể do cache trình duyệt.
**Xử lý:** Nhấn nút **🔄 Refresh** hoặc tải lại trang (Ctrl+F5).

### Không đăng nhập được
**Nguyên nhân:** Sai mật khẩu, tài khoản bị khóa, hoặc server không chạy.
**Xử lý:**
1. Thử reset mật khẩu (liên hệ ADMIN)
2. Kiểm tra tài khoản có bị khóa không
3. Kiểm tra server: `pm2 status`

### Trang trắng / lỗi 500
**Nguyên nhân:** Lỗi server hoặc database không kết nối được.
**Xử lý:**
```bash
pm2 logs step-warehouse --lines 50  # Xem lỗi cụ thể
pm2 restart step-warehouse          # Thử restart
```

---

## PHỤ LỤC

### Phím tắt & Mẹo sử dụng

- **Tìm kiếm nhanh:** Gõ trực tiếp vào ô tìm kiếm, kết quả cập nhật sau 300-400ms (debounce)
- **Xóa filter nhanh:** Nhấn nút 🔄 cạnh dropdown trạng thái để reset về "Tất cả"
- **In tem QR:** Trong chi tiết thiết bị → nhấn **In Tem** để in mã QR gắn thiết bị
- **Lọc nhanh theo kho:** Dùng filter "Lọc Nâng cao" → chọn kho

### Quy ước đặt Serial Number
Khuyến nghị sử dụng serial từ nhà sản xuất. Nếu không có:
- Format gợi ý: `[CATEGORY]-[NĂMNHẬP]-[SỐ THỨ TỰ]`
- Ví dụ: `SRV-2026-001`, `RAM-2026-042`

### Liên hệ hỗ trợ
Nếu gặp vấn đề không có trong tài liệu này, liên hệ quản trị viên hệ thống.

---

*Tài liệu cập nhật lần cuối: 2026*
*Hệ thống: STEP IT Warehouse Management v1.0*
