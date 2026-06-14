# TÀI LIỆU KỊCH BẢN VẬN HÀNH HỆ THỐNG (OPERATIONAL SCENARIOS DOCUMENT)

Tài liệu này hướng dẫn chi tiết các kịch bản thực tế khi vận hành Hệ Thống Quản Lý Kho Thiết Bị IT (Inventory System). Giúp đội ngũ vận hành (IT Operations) thao tác đúng quy trình, kiểm thử chính xác và ngăn chặn các lỗi dữ liệu. 

---

## 1. Lắp server mới từ linh kiện

### 1. Mô tả
Tình huống thực tế khi kho nhận được một Server barebone (chưa có RAM, ổ cứng) và các linh kiện rời. Nhân viên kỹ thuật cần tiến hành lắp ráp chuẩn bị cho server thành một khối hoàn chỉnh để sẵn sàng cho thuê hoặc cấp phát.

### 2. Mục tiêu
Gom các thiết bị đơn lẻ (Server, RAM, SSD) thành một cụm thiết bị duy nhất có quan hệ cha-con (parent-child). Đảm bảo khi thao tác với Server (chuẩn bị cho thuê, di chuyển) thì các linh kiện đi kèm hệ thống cũng được đi theo.

### 3. Điều kiện (Pre-condition)
- **Asset status:** Server (`SN-DEMO-001`), RAM (`RAM-DEMO-001`), và SSD (`SSD-DEMO-001`) hiện tại đều bắt buộc ở trạng thái `IN_STOCK`.
- **Warehouse:** Tất cả thiết bị và linh kiện tham gia lắp ráp phải đang nằm trong cùng một Kho (Warehouse).
- **Rental state:** Không có hợp đồng thuê nào (Không áp dụng).

### 4. Steps thực hiện
- **Bước 1:** Đăng nhập vào hệ thống bằng tài khoản `USER` hoặc `ADMIN`.
- **Bước 2:** Tìm kiếm và chọn thiết bị Server cha có Serial Number là `SN-DEMO-001`.
- **Bước 3:** Nhấn vào chức năng **Lắp ráp (Assemble / Quản lý linh kiện)** từ màn hình chi tiết thiết bị.
- **Bước 4:** Tại modal/drawer lắp ráp, thực hiện scan barcode hoặc tìm kiếm Serial Number `RAM-DEMO-001` và `SSD-DEMO-001` để đưa vào danh sách lắp ráp.
- **Bước 5:** Nhấn **Xác nhận lắp ráp** và kiểm tra thông báo thành công.

### 5. Kết quả mong đợi (Expected Result)
- **Trạng thái asset thay đổi:** Trạng thái của các linh kiện đổi thành đã lắp ráp để không còn hiển thị trống lốc ngoài kho.
- **Quan hệ parent-child thay đổi:** `RAM-DEMO-001` và `SSD-DEMO-001` trở thành "Component" (con) của `SN-DEMO-001`.
- **Log StockMovement:** Hệ thống sinh ra bản ghi lịch sử loại `ASSEMBLE` cho Server và các linh kiện, biểu thị quá trình lắp ráp.

### 6. Thay đổi dữ liệu (Data Changes)
- **parentId:** Của `RAM-DEMO-001` và `SSD-DEMO-001` sẽ được cập nhật thành ID của `SN-DEMO-001`. Của `SN-DEMO-001` vẫn là Null.
- **status:** `RAM-DEMO-001` và `SSD-DEMO-001` chuyển từ `IN_STOCK` -> `INSTALLED`. (`SN-DEMO-001` vẫn là `IN_STOCK`).
- **warehouseId:** Giữ nguyên (bằng đúng ID kho hiện tại).
- **rental status:** Không thay đổi.

### 7. Tip vận hành
- **Kiểm tra gì:** Hãy quét mã vạch hai lần để chắc chắn bạn không cầm nhầm RAM của Server khác. Chắc chắn rằng linh kiện chuẩn bị gắn vào cấu hình thực tế đúng khớp với thao tác trên phần mềm.
- **Tránh lỗi gì:** Tránh thao tác ráp linh kiện nằm ở "Kho A" vào Server nằm ở "Kho B" mà chưa làm phiếu điều chuyển (Transfer).

### 8. Edge Cases (QUAN TRỌNG)
- **Lắp sai linh kiện:** Hệ thống sẽ chặn hoặc cảnh báo khi cố gắng lắp một linh kiện đã bị gán `FAULTY` (Lỗi/Hỏng) hoặc đang `RENTED`.
- **Thiếu linh kiện:** Nếu search không ra thiết bị `RAM-DEMO-001`, có thể thiết bị này chưa được nhập kho hoặc đã bị một Server khác chiếm dụng (trạng thái đang là `INSTALLED`).
- **Khác kho hàng:** Hệ thống phải bắt lỗi nếu linh kiện đem ráp không thuộc cùng một Warehouse với Server. 

---

## 2. Các linh kiện bị lỗi → thay thế

### 1. Mô tả
Một Server đang nằm trong kho hoặc vừa thu hồi về chuẩn bị kiểm tra thì phát hiện dính lỗi SSD. Kỹ thuật viên cần tháo SSD lỗi ra để gửi bảo hành/sửa chữa thiết bị, đồng thời lấy một bản SSD dự phòng mới từ trong kho để thay thế vào.

### 2. Mục tiêu
Cập nhật đúng trạng thái hỏng của linh kiện bị tháo ra để ngăn không được cấp cho các giao dịch khác. Gắn thành công linh kiện dự trữ vào Server đảm bảo Server nguyên vẹn cấu hình linh kiện để tiếp tục kinh doanh.

### 3. Điều kiện (Pre-condition)
- **Asset status:** 
  - Server `SN-DEMO-001` đang `IN_STOCK`.
  - Ổ cứng `SSD-DEMO-001` (đang nằm trong Server) có trạng thái `INSTALLED`.
  - Ổ cứng dự phòng `SSD-DEMO-002` (chuẩn bị thay thế) phải ở trạng thái `IN_STOCK`.
- **Warehouse:** Tất cả nằm tại cùng một kho.
- **Rental state:** Không có.

### 4. Steps thực hiện
- **Bước 1:** Vào trang chi tiết thiết bị Server `SN-DEMO-001`, chọn tab linh kiện (Components).
- **Bước 2:** Chọn Component `SSD-DEMO-001` -> Nhấn **Tháo rời (Disassemble)**, hệ thống yêu cầu chọn lý do, chọn "Tháo rời do lỗi".
- **Bước 3:** Chuyển trạng thái linh kiện `SSD-DEMO-001` vừa tháo ra thành **Lỗi (FAULTY)**.
- **Bước 4:** Quay lại màn hình Lắp ráp (Assemble) của `SN-DEMO-001`, chọn linh kiện thay thế là `SSD-DEMO-002`. Xác nhận thao tác.

### 5. Kết quả mong đợi (Expected Result)
- **Trạng thái asset thay đổi:** SSD cũ đổi trạng thái thành Lỗi. SSD mới nhảy vào thay thế.
- **Quan hệ parent-child thay đổi:** `SSD-DEMO-001` mất quan hệ cha (bị cắt đứt với `SN-DEMO-001`). `SSD-DEMO-002` lập quan hệ cha-con với `SN-DEMO-001`.
- **Log StockMovement:** Hệ thống sinh log `DISASSEMBLE` cho cái cũ và log `ASSEMBLE` cho cái mới. Thêm một log `UPDATE` trạng thái của cái cũ thành FAULTY.

### 6. Thay đổi dữ liệu (Data Changes)
- **parentId:** 
  - `SSD-DEMO-001`: Đổi thành `Null`.
  - `SSD-DEMO-002`: Đổi thành ID của `SN-DEMO-001`.
- **status:** 
  - `SSD-DEMO-001` chuyển từ `INSTALLED` -> `IN_STOCK` -> chuyển thành `FAULTY`.
  - `SSD-DEMO-002` chuyển từ `IN_STOCK` -> `INSTALLED`.
- **warehouseId:** Tất cả giữ nguyên.
- **rental status:** Không thay đổi.

### 7. Tip vận hành
- **Kiểm tra gì:** Phải thực sự dán nhãn "Hàng Lỗi" bằng tay lên `SSD-DEMO-001` tại kho ngoài đời thực để tránh nhầm lẫn bỏ lại vào rổ hàng bình thường.
- **Tránh lỗi gì:** Tránh quên việc đổi trạng thái của cái bị lỗi thành `FAULTY` mà vẫn để `IN_STOCK`, dễ dẫn đến bạn khác bốc nhầm SSD lỗi đó gắn cho một khách hàng mới.

### 8. Edge Cases (QUAN TRỌNG)
- **Server đang cho thuê:** Nếu Server `SN-DEMO-001` đang trong status `RENTED` thì việc tháo lắp sẽ phức tạp hơn (sẽ cần phải Return hoặc Maintenance Server trước).
- **Không có hàng thay thế:** Nếu kho không còn `SSD` nào có status `IN_STOCK`, kỹ thuật chỉ được tháo ra và Server đó coi như bị khuyết cấu hình (Chờ xuất/Nhập hàng).

---

## 3. Server đang thuê → khách trả

### 1. Mô tả
Hết hợp đồng thuê server, khách hàng trả lại Server `SN-DEMO-001` cho Data Center / Kho. Nhân viên tiến hành công tác kiểm tra nhận lại hàng và xác nhận thiết bị quay lại kho hàng để tái kinh doanh.

### 2. Mục tiêu
Trả các thiết bị về trạng thái bảo quản trong kho, có hiệu lực kinh doanh. Thanh lý/chấm dứt Hợp đồng thuê trên hệ thống. Truy vết chính xác lịch sử nhận trả hàng.

### 3. Điều kiện (Pre-condition)
- **Asset status:** Server `SN-DEMO-001` và tất cả các component bên trong (như `RAM-DEMO-001`, `SSD-DEMO-001`) đang ở trạng thái `RENTED`.
- **Warehouse:** Server đang ở vị trí của khách, bắt buộc phải trả vào một Kho cụ thể (Ví dụ: Kho Tổng).
- **Rental state:** Server có ít nhất một hợp đồng thuê đang có trạng thái `ACTIVE` (hoặc `EXPIRED` chưa trả).

### 4. Steps thực hiện
- **Bước 1:** Vào Module **Rental Contracts** (Quản lý hợp đồng), tìm kiếm hợp đồng đang dính với `SN-DEMO-001`.
- **Bước 2:** Chọn **Trả thiết bị (Return / Receive)**. 
- **Bước 3:** Hệ thống hiển thị form yêu cầu xác nhận. User cần check tình trạng vật lý (Có xước hỏng gì không, còn đủ RAM hay SSD không). 
- **Bước 4:** Ghi log đánh giá vào ghi chú (Note) và nhấn **Xác nhận trả hàng**.

### 5. Kết quả mong đợi (Expected Result)
- **Trạng thái asset thay đổi:** Toàn bộ hệ thống liên quan bao gồm Server cha và các máy con đổi về trạng thái trong kho.
- **Quan hệ parent-child thay đổi:** Không thay đổi (Server ráp sao trả vậy thì nguyên parent-child). Trừ khi bị khách trả thiếu linh kiện thì phải chuyển qua quy trình tháo linh kiện và bắt đền.
- **Log StockMovement:** Sinh log `RETURN` cho cả Server và các tài sản con đính kèm.

### 6. Thay đổi dữ liệu (Data Changes)
- **parentId:** Giữ nguyên (nếu vẫn giữ linh kiện bên trong).
- **status:** `SN-DEMO-001` chuyển từ `RENTED` -> `IN_STOCK` (hoặc `MAINTENANCE` nếu cần kiểm tra thêm). 
  - Nếu linh kiện bên trong để `INSTALLED` thì nó sẽ từ `RENTED` chuyển thành `INSTALLED`. Điều này thiết kế theo cách hệ thống quản lý. Tuy nhiên quy định ở đây ta coi component bên trong máy là `INSTALLED` hoặc `IN_STOCK`. Thường sẽ đưa con trực tiếp về `INSTALLED`.
- **warehouseId:** Trở lại đúng ID cái kho vừa nhận hàng.
- **rental status:** Rental Contract chuyển từ `ACTIVE/EXPIRED` -> `RETURNED`.

### 7. Tip vận hành
- **Kiểm tra gì:** Cực kỳ quan trọng phải bóc máy ra kiểm tra đủ dung lượng RAM (`RAM-DEMO-001`) và SN của màn cứng (`SSD-DEMO-001`) bên trong máy để tránh trường hợp khách tráo linh kiện.
- **Tránh lỗi gì:** Trễ hẹn xử lý form dẫn đến cảnh báo hệ thống (alert) chạy sai logic gửi báo cáo chậm deadline cho khách.

### 8. Edge Cases (QUAN TRỌNG)
- **Thiếu linh kiện:** Nếu lúc check phát hiện mất `RAM-DEMO-001`, bạn phải làm thêm bước Disassemble linh kiện đó ra, đánh mất (LOST hoặc FAULTY), và tính tiền phạt khách.
- **Khách không trả đủ bộ:** Phải có cách ngắt linh kiện khỏi hợp đồng trả trước/sau (Thực tế thường là tháo linh kiện ngay trên hệ thống trước khi trả nguyên server).

---

## 4. Di chuyển thiết bị giữa kho

### 1. Mô tả
Công ty quyết định chuyển Server `SN-DEMO-001` (và các linh kiện nằm trong nó) từ **Kho A** (Kho Nội chính) sang **Kho B** (Kho Datacenter) để phục vụ cho tiện ích triển khai gần khu vực của khách hàng chuẩn bị thuê.

### 2. Mục tiêu
Cập nhật đúng số lượng lưu kho tại từng Warehouse (Warehouse A trừ đi, Warehouse B cộng thêm). Đảm bảo bảo toàn nguyên cấu trúc Cha-Con khi chuyển kho.

### 3. Điều kiện (Pre-condition)
- **Asset status:** Server `SN-DEMO-001` (và các linh kiện con như `RAM-DEMO-001`) đều phải có trạng thái cho phép di chuyển (ví dụ: `IN_STOCK`).
- **Warehouse:** Hiện tại đang thuộc `warehouseId` là của Kho A.
- **Rental state:** Không nằm trong hợp đồng `ACTIVE` hay `RENTED`.

### 4. Steps thực hiện
- **Bước 1:** Kỹ thuật / Admin tạo một phiếu **Điều Chuyển / Di chuyển (Transfer)**.
- **Bước 2:** Chọn thiết bị Nguồn là `SN-DEMO-001` tại Kho A.
- **Bước 3:** Chọn đích đến (Dest) là **Kho B** (Datacenter).
- **Bước 4:** Ghi âm/chụp ảnh tình trạng thiết bị trước khi lên xe chuyển giao -> Xác nhận **Chuyển kho**.

### 5. Kết quả mong đợi (Expected Result)
- **Trạng thái asset thay đổi:** Vẫn là `IN_STOCK` nhưng giờ đã sang nhà mới.
- **Quan hệ parent-child thay đổi:** Không thay đổi. Khối Parent-Child này di chuyển đi CÙNG NHAU.
- **Log StockMovement:** Sinh log hành động `TRANSFER` lưu lại người chuyển, ngày giờ và 2 kho A, B. 

### 6. Thay đổi dữ liệu (Data Changes)
- **parentId:** Giữ nguyên.
- **status:** Vẫn là `IN_STOCK` (và `INSTALLED` cho các thiết bị con).
- **warehouseId:** Thuộc tính `warehouseId` của Server cha AND tất cả linh kiện con bên trong nó đồng loạt được cập nhật thành ID của **Kho B**.
- **rental status:** Không áp dụng.

### 7. Tip vận hành
- **Kiểm tra gì:** Chắc chắn khi di chuyển `SN-DEMO-001` phải mang đầy đủ linh kiện (không tháo ra để quên). Khi thiết bị sang tới nơi, chi nhánh đích mới được phép bấm xác nhận "Đã nhận". (Nếu luồng có pending).
- **Tránh lỗi gì:** Tránh di chuyển từng linh kiện lẻ tẻ thay vi chuyển thẳng thiết bị cha. Chỉ cần chuyển Asset cha, phần mềm phải Auto lôi các thành phần con theo (Cascade Update).

### 8. Edge Cases (QUAN TRỌNG)
- **Di chuyển khi đang RENTED:** Hệ thống PHẢI chặn thao tác đổi kho nếu Server đang ở trạng thái `RENTED`. Vì khi cho khách thuê, tài sản đã bị Lock, mọi thay đổi Inventory chỉ tính khi có lệnh `RETURN`.
- **Giao diện sai kho:** Nếu có một ai dó cố gắng nhét thủ công một linh kiện đã chuyển tới B đem đi ráp cho 1 Server còn để ở kho A (Vi phạm Rule về đồng bộ vị trí).

---

## 5. Di chuyển linh kiện giữa các server

### 1. Mô tả
Trong kho có 2 Server: `SN-DEMO-001` (khách yêu cầu tháo RAM ra cho rẻ) và `SN-DEMO-002` (khách yêu cầu nâng cấp thêm RAM). Kỹ thuật tiến hành tháo `RAM-DEMO-001` đang từ `SN-DEMO-001` lắp trực tiếp sang `SN-DEMO-002`.

### 2. Mục tiêu
Tháo rời linh kiện từ Server Gốc 1 một cách an toàn nhất và gán nó làm thành phần con của Server Đích 2 mà không làm mất tính toàn vẹn dữ liệu, lịch sử của linh kiện.

### 3. Điều kiện (Pre-condition)
- **Asset status:** Server `SN-DEMO-001` và `SN-DEMO-002` đang `IN_STOCK`. Linh kiện `RAM-DEMO-001` đang thuộc quyền sở hữu của `SN-DEMO-001` (với trạng thái `INSTALLED`).
- **Warehouse:** Tất cả tài sản này phải đang nằm chung lưới của 1 Kho duy nhất.
- **Rental state:** Không cho thuê (`ACTIVE`).

### 4. Steps thực hiện
- **Bước 1:** Mở chi tiết thiết bị Server `SN-DEMO-001` -> Xem list `Components`.
- **Bước 2:** Chọn `RAM-DEMO-001` ấn nút **Tháo rời (Disassemble)**, ghi chú "Tháo để điều chuyển nội bộ". RAM hoàn tất quá trình nhả liên kết và rơi thành tài sản tự do.
- **Bước 3:** Mở chi tiết thiết bị Server `SN-DEMO-002`.
- **Bước 4:** Chọn **Lắp ráp (Assemble)** -> Chọn linh kiện trống đang rảnh rỗi là `RAM-DEMO-001`.
- **Bước 5:** Xác nhận thao tác lắp ráp.

### 5. Kết quả mong đợi (Expected Result)
- **Trạng thái asset thay đổi:** RAM rớt xuống `IN_STOCK` trong 30s sau đó bật ngược lại `INSTALLED` khi khớp vào Server mới.
- **Quan hệ parent-child thay đổi:** `RAM-DEMO-001` đổi cha từ `SN-DEMO-001` sang `SN-DEMO-002`.
- **Log StockMovement:** Hệ thống sẽ sinh 1 record log `DISASSEMBLE` khỏi máy 1, và liền sau đó là record `ASSEMBLE` vào máy 2. Lịch sử di chuyển minh bạch tuyệt đối.

### 6. Thay đổi dữ liệu (Data Changes)
- **parentId:** Của `RAM-DEMO-001` đổi từ ID(`SN-DEMO-001`) thành ID(`SN-DEMO-002`).
- **status:** `RAM-DEMO-001` kết thúc bằng trạng thái `INSTALLED`. Hai Server vẫn `IN_STOCK`.
- **warehouseId:** Giữ nguyên (Cả đám cùng kho).
- **rental status:** Không đổi.

### 7. Tip vận hành
- **Kiểm tra gì:** Nếu trong quá trình tháo, vô tình làm hỏng chân RAM, kỹ thuật BẮT BUỘC phải tạo request trả RAM đó về `FAULTY` thay vì đem đi gắn sang máy `SN-DEMO-002` để tránh ăn đòn oan từ khách thuê.
- **Tránh lỗi gì:** Tránh để tình trạng tháo bằng mồm ngoài đời thực nhưng trên phần mềm cấu hình hệ thống `SN-DEMO-001` vẫn còn chứa RAM đó. Cần check real-time.

### 8. Edge Cases (QUAN TRỌNG)
- **Asset sai trạng thái:** Nếu `SN-DEMO-001` đang `RENTED`, hệ thống KHÔNG CẤP cho phép bấm nút "Tháo Rời". Linh kiện thuộc hợp đồng đang ký thì không ai được phép trích xuất.
- **Bất đồng bộ kho hàng:** Nếu do sai trái nào đó mà `SN-DEMO-002` đang nằm ở chi nhánh Hà Nội mà `RAM-DEMO-001` lại ở chi nhánh HCM, hệ thống bắt buộc reject màn Assemble đó.

---

## 6. Thêm thiết bị / linh kiện mới (Nhập kho)

### 1. Mô tả
Công ty mới mua về một lô hàng gồm Server và các linh kiện rời. Nhân viên thủ kho tiến hành nhập số lượng hàng này vào hệ thống để bắt đầu quản lý.

### 2. Mục tiêu
Ghi nhận tài sản mới vào hệ thống với đầy đủ thông tin (Product, Serial Number, Kho lưu trữ). Đảm bảo thiết bị sẵn sàng cho các nghiệp vụ tiếp theo (Lắp ráp, Cho thuê).

### 3. Điều kiện (Pre-condition)
- **Asset status:** Không có (Tài sản chưa tồn tại trên hệ thống).
- **Warehouse:** Đã có sẵn Kho (Ví dụ: Kho Tổng) trên hệ thống để chứa thiết bị.
- **Rental state:** Không có.

### 4. Steps thực hiện
- **Bước 1:** Vào module **Inventory / Quản lý tài sản**, chọn **Thêm mới (Add Asset)** hoặc **Import Excel**.
- **Bước 2:** Chọn danh mục / Product tương ứng (Ví dụ: `Server Dell R740`, `RAM 64GB DDR4`).
- **Bước 3:** Nhập Serial Number cho từng thiết bị (Ví dụ: `SN-DEMO-003`, `RAM-DEMO-002`).
- **Bước 4:** Chọn **Kho lưu trữ (Warehouse)** là Kho Tổng.
- **Bước 5:** Lưu thiết bị.

### 5. Kết quả mong đợi (Expected Result)
- **Trạng thái asset thay đổi:** Hệ thống tạo ra các dòng tài sản mới với trạng thái mặc định.
- **Quan hệ parent-child thay đổi:** Không có (Các thiết bị mới nhập kho ban đầu đều là thiết bị độc lập, chưa lắp ráp).
- **Log StockMovement:** Hệ thống sinh log `IMPORT` ghi nhận lần đầu tài sản xuất hiện trong kho.

### 6. Thay đổi dữ liệu (Data Changes)
- **parentId:** `Null`.
- **status:** Khởi tạo là `IN_STOCK`.
- **warehouseId:** Lưu đúng ID của Kho Tổng.
- **rental status:** Không có.

### 7. Tip vận hành
- **Kiểm tra gì:** Serial Number phải được nhập chính xác 100% (có thể dùng thiết bị quét mã vạch) vì đây là "chứng minh thư" của thiết bị. Phải chọn chuẩn Product tương ứng.
- **Tránh lỗi gì:** Chọn sai Kho nhập hàng sẽ dẫn đến tình trạng số liệu thiết bị lệch giữa thực tế và phần mềm, gây cản trở cho việc xuất kho sau này.

### 8. Edge Cases (QUAN TRỌNG)
- **Trùng Serial Number:** Hệ thống BẮT BUỘC phải chặn lại và báo lỗi nếu nhập một `Serial Number` đã tồn tại trên hệ thống.
- **Product không tồn tại:** Nhân viên phải yêu cầu ADMIN tạo mới Product Template vào danh mục trước khi nhập hàng nếu là lô hàng model sản phẩm mới.

---

## 7. Di chuyển thiết bị, linh kiện lẻ giữa các kho

### 1. Mô tả
Để phục vụ cho nhu cầu bảo hành hoặc bổ sung linh kiện tại chi nhánh khác, kỹ thuật viên cần gửi gấp một thanh RAM rời đang nằm trong kho Hà Nội chuyển vào kho Hồ Chí Minh mà không đi kèm với bất kỳ Server nào.

### 2. Mục tiêu
Cập nhật vị trí lưu trữ (Warehouse) của thiết bị/linh kiện lẻ một cách chính xác mà không làm ảnh hưởng đến các thiết bị khác.

### 3. Điều kiện (Pre-condition)
- **Asset status:** Linh kiện `RAM-DEMO-002` bắt buộc phải ở trạng thái độc lập `IN_STOCK` (Không bị gắn vào bất kỳ Server nào).
- **Warehouse:** Hiện tại đang thuộc Kho A (Kho Hà Nội).
- **Rental state:** Không có.

### 4. Steps thực hiện
- **Bước 1:** Vào chức năng **Điều Chuyển / Di chuyển (Transfer)**.
- **Bước 2:** Chọn tài sản cần chuyển là `RAM-DEMO-002` tại Kho A.
- **Bước 3:** Chọn đích đến là Kho B (Kho HCM).
- **Bước 4:** Xác nhận lệnh chuyển kho.

### 5. Kết quả mong đợi (Expected Result)
- **Trạng thái asset thay đổi:** Vẫn duy trì là `IN_STOCK` nhưng ở kho mới.
- **Quan hệ parent-child thay đổi:** Không có (Linh kiện lẻ không có cha).
- **Log StockMovement:** Sinh log hành động `TRANSFER` cho linh kiện từ Kho A sang Kho B.

### 6. Thay đổi dữ liệu (Data Changes)
- **parentId:** Vẫn là `Null`.
- **status:** Vẫn là `IN_STOCK`.
- **warehouseId:** Chuyển từ ID của Kho A sang ID của Kho B.
- **rental status:** Không áp dụng.

### 7. Tip vận hành
- **Kiểm tra gì:** Chắc chắn rằng linh kiện đó đúng là đang rời bên ngoài, không phải là dạng cấu hình đã ráp ảo trên hệ thống mà thực tế thì không thấy đâu.
- **Tránh lỗi gì:** Tránh chọn nhầm RAM đang nằm trong một Server (`INSTALLED`), điều này sẽ vi phạm quy tắc toàn vẹn cấu trúc vật lý.

### 8. Edge Cases (QUAN TRỌNG)
- **Thiết bị đang INSTALLED:** Nếu nhân viên cố tình chọn tài sản `RAM-DEMO-001` (đang nằm trong `SN-DEMO-001`), hệ thống phải CHẶN thao tác này, yêu cầu người dùng phải thực hiện quy trình `Tháo rời (Disassemble)` trước.
- **Thiết bị đang RENTED/FAULTY:** Hệ thống cần khóa hoặc cảnh báo khi cố di chuyển thiết bị đang thuộc hợp đồng thuê. Đối với hàng lỗi (`FAULTY`), tuỳ theo quy trình của công ty (Thường `FAULTY` vẫn cho di chuyển về kho Tổng để bảo hành).

---

## 8. Sửa thông tin thiết bị (Cập nhật vị trí Rack, Ghi chú)

### 1. Mô tả
Thiết bị `SN-DEMO-001` đã được nhập kho (ở Kho Datacenter) nhưng đang để trống thông tin vị trí Rack. Nhân viên IT Operations tiến hành đặt thiết bị lên tủ Rack thực tế tại DC và cần cập nhật vị trí lưu trữ (Rack Name, số U) cùng các ghi chú vào hệ thống.

### 2. Mục tiêu
Cập nhật đúng vị trí vật lý (Rack ID, Rack Unit) của thiết bị trên phần mềm để đồng bộ với thực tế, giúp quá trình tìm kiếm tài sản trong kho (DC) sau này diễn ra nhanh chóng.

### 3. Điều kiện (Pre-condition)
- **Asset status:** Server `SN-DEMO-001` đang ở trạng thái `IN_STOCK`.
- **Warehouse:** Server đang nằm ở Kho B (Kho Datacenter). Data của Kho Datacenter đã được cấu hình các `Rack` (Ví dụ: Rack A1).
- **Rental state:** Không có.

### 4. Steps thực hiện
- **Bước 1:** Vào module **Inventory / Quản lý tài sản**, tìm kiếm Server `SN-DEMO-001`.
- **Bước 2:** Nhấn nút **Sửa / Edit** thiết bị.
- **Bước 3:** Tại form Edit, tìm đến trường **Vị trí (Location / Rack)**.
- **Bước 4:** Chọn `Rack A1`, chọn vị trí bắt đầu là `U: 10`. (Hệ thống tự động tính toán số U chiếm dụng dựa trên `uHeight` của Server).
- **Bước 5:** Thêm **Ghi chú (Notes)**: "Mounting server for Project X".
- **Bước 6:** Nhấn **Lưu thay đổi (Save / Update)**.

### 5. Kết quả mong đợi (Expected Result)
- **Trạng thái asset thay đổi:** Không thay đổi (vẫn là `IN_STOCK`).
- **Quan hệ parent-child thay đổi:** Không.
- **Log StockMovement:** (Tuỳ hệ thống có tracking log `UPDATE` cho thay đổi vị trí rack hay không, thường là sẽ có log `UPDATE_ASSET`).
- **Bản đồ Rack:** Giao diện Rack Visualizer (Nơi hiển thị biểu đồ tủ Rack) sẽ vẽ ngay khối `SN-DEMO-001` ở vị trí U10 đến U11 (nếu là Server 2U).

### 6. Thay đổi dữ liệu (Data Changes)
- **parentId:** Giữ nguyên.
- **status:** Giữ nguyên.
- **warehouseId:** Giữ nguyên.
- **rackId:** Cập nhật thành ID của `Rack A1`.
- **rackUnit:** Cập nhật thành `10`.
- **notes:** Bổ sung text ghi chú.

### 7. Tip vận hành
- **Kiểm tra gì:** Phải đảm bảo chiều cao (U) của thiết bị trống đủ tại vị trí U10 trên Rack A1 ngoài đời.
- **Tránh lỗi gì:** Tránh cập nhật đè lên vị trí U đang có thiết bị khác nằm (Trừ trường hợp phần mềm có cơ chế bắt lỗi Overlap / Trùng vị trí).

### 8. Edge Cases (QUAN TRỌNG)
- **Lỗi chồng chéo Rack (Rack Overlap):** Nếu vị trí U10-U11 đã có Server khác cắm ở đó, hệ thống bắt buộc văng lỗi Validation và chặn thao tác Lưu.
- **Server chứa con chuyển Rack:** Khi Server cha `SN-DEMO-001` được gán vào Rack, hiểu ngầm các linh kiện con (`RAM-DEMO-001`) bên trong nó cũng đang nằm ở vị trí Rack đó. IT Operations không cần (và không được phép) đi Edit vị trí Rack thủ công cho từng thanh RAM con.

---

## 9. Tạo hợp đồng cho thuê thiết bị mới (Rent Asset)

### 1. Mô tả
Một khách hàng doanh nghiệp ký hợp đồng thuê ngắn hạn Server `SN-DEMO-001`. Nhân viên vận hành tiến hành tạo **Hợp Đồng Thuê (Rental Contract)** trên hệ thống để bắt đầu khóa (lock) thiết bị, cảnh báo hết hạn, và chuyển thiết bị đi bàn giao cho khách.

### 2. Mục tiêu
Quản lý vòng đời cho thuê thiết bị. Tách Server (và toàn bộ linh kiện của nó) khỏi trạng thái sẵn sàng bán/thuê. Bắt đầu kích hoạt tiến trình gửi Email/Thông báo tự động đến ngày hết hạn hợp đồng.

### 3. Điều kiện (Pre-condition)
- **Asset status:** Server `SN-DEMO-001` và các linh kiện bên trong đang ở vị trí sẵn sàng (`IN_STOCK`, `INSTALLED`).
- **Warehouse:** Đang trong kho quản lý.
- **Rental state:** Không có hợp đồng `ACTIVE` hiện hành lên `SN-DEMO-001`.

### 4. Steps thực hiện
- **Bước 1:** Vào module **Rental Contracts / Quản lý hợp đồng**, chọn **Tạo mới (New Rental Contract)**.
- **Bước 2:** Nhập các thông tin hợp đồng:
  - Tên/Mã khách hàng: "Công ty TNHH Demo"
  - Ngày bắt đầu (Start Date): 01/04/2026
  - Ngày kết thúc (End Date): 01/05/2026
- **Bước 3:** Tại mục **Thiết bị cho thuê (Asset)**, search và chọn `SN-DEMO-001`.
- **Bước 4:** Bấm **Lưu và Kích hoạt (Save & Activate)**.

### 5. Kết quả mong đợi (Expected Result)
- **Trạng thái asset thay đổi:** Hệ thống tự động update status của Server và các linh kiện đi kèm thành `RENTED`.
- **Quan hệ parent-child thay đổi:** Không.
- **Log StockMovement:** Sinh ra log `RENT` xác nhận thiết bị đã được mang đi cho thuê (Kèm thông tin ID khách hàng hoặc Contract ID).
- **Hệ thống cảnh báo:** Các trigger gửi cảnh báo tự động ở mốc 14 ngày, 7 ngày, 3 ngày... trước khi hết hạn bắt đầu chạy ngầm vào mỗi ngày lúc nửa đêm (Cronjob).

### 6. Thay đổi dữ liệu (Data Changes)
- **parentId:** Giữ nguyên.
- **status:** Chuyển từ `IN_STOCK` (hoặc `INSTALLED` cho con) sang `RENTED`.
- **warehouseId:** Giữ nguyên (Thiết bị vẫn được quản lý tồn kho tại cơ sở nhưng status bị Lock chờ ngày trả về).
- **rental status:** Một bản ghi `RentalContract` mới được tạo với trạng thái `ACTIVE`.
- **rackId/rackUnit:** Có thể bị clear về `null` vì thiết bị bị nhổ ra khỏi tủ rack để mang đi cho khách. 

### 7. Tip vận hành
- **Kiểm tra gì:** Phải kiểm tra Server này đã đầy đủ linh kiện chạy test xong, đúng cấu hình khách cần chưa trước khi ấn nút. Không cho thuê cái Server trần trụi nếu hợp đồng ghi bao gồm RAM, SSD.
- **Tránh lỗi gì:** Trễ tạo hợp đồng trên App so với giấy tờ vật lý dẫn đến ngày bắt đầu/kết thúc tính Alert bị lệch, kỹ thuật viên không kịp chuẩn bị hàng thay thế.

### 8. Edge Cases (QUAN TRỌNG)
- **Thiết bị đang Lỗi/Bảo hành:** Hệ thống SẼ CHẶN cứng việc Search / Gán `SN-DEMO-001` vào Contract nếu thiết bị đó đang ở status `FAULTY` hoặc `MAINTENANCE`.
- **Thiết bị đã có người thuê:** Không thể cho thuê một tài sản đang nằm trong một hợp đồng `ACTIVE` hoặc `EXPIRED` khác.
- **Bóc linh kiện khi đang RENTED:** Như đã mô tả ở các kịch bản trên, khi đã vào form `RENTED`, tính năng "Tháo ráp linh kiện (Assemble/Disassemble)" của Server này sẽ bị vô hiệu hóa hoàn toàn để bảo vệ cấu trúc hợp đồng.

---

## 10. Xử lý thiết bị hết hạn Hợp đồng (Expired) nhưng khách gia hạn

### 1. Mô tả
Hợp đồng thuê Server `SN-DEMO-001` tới ngày `01/05/2026` nhưng khách hàng gọi điện báo muốn gia hạn thêm 1 tháng nữa. Nhân viên sẽ tiến hành sửa lại thời hạn hợp đồng thay vì tạo hợp đồng mới.

### 2. Mục tiêu
Cập nhật lại thời gian theo dõi tự động của hợp đồng đang Active/Expired để tránh hệ thống báo ảo và gửi nhầm thông điệp thu hồi tài sản tới khách.

### 3. Điều kiện (Pre-condition)
- **Asset status:** Server `SN-DEMO-001` đang `RENTED`.
- **Warehouse:** Bất kỳ.
- **Rental state:** Hợp đồng đang `ACTIVE` (Gần hết hạn) hoặc vừa bị đổi thành `EXPIRED` bởi hệ thống Cronjob chạy đêm qua.

### 4. Steps thực hiện
- **Bước 1:** Vào module **Rental Contracts**, tìm Hợp đồng của "Công ty TNHH Demo".
- **Bước 2:** Nhấn **Cập nhật (Update / Edit)** hợp đồng.
- **Bước 3:** Đổi **Ngày kết thúc (End Date)** từ `01/05/2026` lên `01/06/2026`.
- **Bước 4:** (Tuỳ chọn) Nếu Hợp đồng đang bị `EXPIRED`, có thể cần chuyển trạng thái thủ công thành `ACTIVE`.
- **Bước 5:** Bấm **Lưu thay đổi**.

### 5. Kết quả mong đợi (Expected Result)
- **Trạng thái asset thay đổi:** Không thay đổi (Hàng vẫn đang trong tay khách -> Vẫn là `RENTED`).
- **Quan hệ parent-child thay đổi:** Không.
- **Log StockMovement:** Hệ thống báo cập nhật Hợp đồng (`UPDATE_RENTAL`).
- **Hệ thống cảnh báo:** Các cờ trạng thái cảnh báo (`alert14Sent`, `alert7Sent`...) sẽ được Reset về `False` để đến đúng mốc tháng 6 nó sẽ gửi email lại.

### 6. Thay đổi dữ liệu (Data Changes)
- **parentId:** Giữ nguyên.
- **status:** Vẫn là `RENTED`.
- **warehouseId:** Giữ nguyên.
- **rental status:** Trạng thái có thể chuyển từ `EXPIRED` -> `ACTIVE` lại sau khi lưu, cùng với `endDate` mới. Các cờ `alert*Sent` Reset -> `Boolean(false)`.

### 7. Tip vận hành
- **Kiểm tra gì:** Giữ nguyên bằng chứng file đính kèm/ email xác nhận gia hạn để sau này kế toán check đối chiếu thanh toán tiền trước khi update trên hệ thống.
- **Tránh lỗi gì:** Tránh tạo Hợp Đồng mới thay vì Gia hạn, có thể làm dữ liệu thiết bị lỗi chồng chéo 2 cái hoặc làm gãy đường dây Lịch Sử của Thiết bị đó.

### 8. Edge Cases (QUAN TRỌNG)
- **Khách không trả, không gia hạn (Cố tình chây ì):** Hàng sẽ ở trạng thái treo (`EXPIRED` của hợp đồng). Hệ thống sẽ có cảnh báo Level Critical. Tuỳ theo logic app, hệ thống có thể tạm khoá Asset để IT Operations chuyển nhóm xử lý pháp chế nhảy vào đòi hàng. Lúc này Asset vẫn `RENTED` và KHÔNG THỂ tái sử dụng cho người khác.

---
*Tài liệu này được biên soạn cho mục đích đào tạo (Training), Test Data, Demo và đối chiếu (Cross-check) vận hành thực tế tại doanh nghiệp.*
