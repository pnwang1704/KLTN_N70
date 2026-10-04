# Yêu Cầu Dự Án & Đặc Tả Kỹ Thuật (Project Requirements & Technical Specifications)

## Đề tài: Hệ thống Quản lý Vận hành cho Chuỗi Quán Cà phê / Nhà hàng Đa chi nhánh (F&B Multi-branch Management System)

---

## 1. Tổng Quan Dự Án

* **Mô hình kiến trúc:** Microservices Architecture kết hợp Event-Driven Architecture (Database-per-Service).
* **Mục tiêu:** Xây dựng giải pháp công nghệ toàn diện cho chuỗi F&B đa chi nhánh, bao gồm:
  - Quản lý tập trung toàn chuỗi (Thực đơn, công thức, tài khoản phân quyền RBAC).
  - Bán hàng tại quầy (POS Web) với cơ chế chiết khấu linh hoạt (% và tiền mặt) và thanh toán đa phương thức (Tiền mặt, VietQR PayOS).
  - Đặt món tự phục vụ tại bàn qua mã QR (Customer Web) theo mô hình **Thanh toán sau tại quầy (Post-pay)**.
  - Điều phối nhà bếp thời gian thực (KDS Web) qua WebSocket Socket.IO.
  - Tự động hóa trừ kho theo công thức định mức (Recipe) bằng SAGA Pattern qua RabbitMQ.

---

## 2. Công Nghệ Sử Dụng (Tech Stack)

* **Backend Framework:** NestJS (TypeScript), TypeORM cho các Microservices và API Gateway.
* **Database:** PostgreSQL (Mỗi service quản lý một database độc lập: `auth_db`, `branch_db`, `product_db`, `order_db`, `inventory_db`, `reporting_db`).
* **Message Broker:** RabbitMQ (Xử lý đồng bộ RPC qua Message Pattern và bất đồng bộ Pub/Sub Event `order_completed`).
* **Realtime Communication:** Socket.IO Server (Port `3004`, phân tách Room theo từng `branchId`).
* **Cổng thanh toán:** PayOS API (Sinh mã VietQR động theo chuẩn Napas 247).
* **Frontend:** React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons, Socket.IO Client.
* **Hạ tầng & Devops:** Docker, Docker Compose với hệ thống **Named Persistent Volumes** cho toàn bộ cơ sở dữ liệu và message broker.
* **Testing:** Jest Unit Testing cho RBAC Guards và Transactional Inventory Service.

---

## 3. Cấu Trúc Các Dịch Vụ Microservices

1. **API Gateway (Port 3000):** Cổng tiếp nhận duy nhất cho Client; đảm nhiệm xác thực Stateless JWT, phân quyền vai trò (RBAC `RolesGuard`), định tuyến request qua RabbitMQ RPC và tích hợp PayOS VietQR & Webhook.
2. **Auth Service (`auth_db` - 5432):** Quản lý tài khoản nhân viên, mã hóa mật khẩu Bcrypt, cấp phát JWT và phân quyền theo 5 vai trò: `ADMIN`, `MANAGER`, `CASHIER`, `KITCHEN`, `WAITER`.
3. **Branch Service (`branch_db` - 5437):** Quản lý danh mục chi nhánh, sơ đồ bàn ăn theo trạng thái (Bàn trống, Đang phục vụ).
4. **Product Service (`product_db` - 5434):** Quản lý danh mục món ăn, giá bán cơ sở, biến thể kích thước (Size M, L), Topping và cấu hình bật/tắt món cục bộ tại từng chi nhánh (`branch_product_availabilities`).
5. **Order Service (`order_db` - 5435):** Quản lý vòng đời đơn hàng, chiết khấu (% / tiền mặt), thanh toán hóa đơn, hợp nhất đơn gọi nhiều đợt, dọn dẹp đơn tạm (`DELETE /orders/:id`), quản lý ca làm việc (`Shift`), nhân viên (`Employee`), sinh mã NV tự động (`get_next_employee_code`), chấm công sinh trắc học (`Attendance`), chi tiền mặt két (`Expense`), đối soát kết ca (`shift-summary`) và lưu trữ Socket.IO Realtime Gateway (Port 3004).
6. **Inventory Service (`inventory_db` - 5436):** Quản lý danh mục nguyên liệu thô, định mức tồn kho an toàn, công thức chế biến (`Recipe`) và tự động trừ kho nguyên liệu bằng Database Transaction khi nhận sự kiện `order_completed`.
7. **Reporting Service (`reporting_db` - 5438):** Tổng hợp và truy xuất báo cáo doanh thu, sản lượng món bán chạy và tỷ lệ tiêu hao nguyên liệu.

---

## 4. Ma Trận Yêu Cầu & Tiến Độ Thực Hiện (Requirements Traceability Matrix)

| Mã Use Case | Tên Chức Năng / Nghiệp Vụ | Phân Hệ | Trạng Thái | Ghi Chú Kỹ Thuật Hoàn Thành |
| :--- | :--- | :--- | :--- | :--- |
| **UC01** | Đăng nhập & Xác thực hệ thống | Auth / Gateway | **ĐÃ HOÀN THÀNH** | JWT Stateless Token, mật khẩu Bcrypt, Auto-redirect theo trạng thái đăng nhập. |
| **UC02** | Phân quyền vai trò người dùng (RBAC) | Auth / Gateway | **ĐÃ HOÀN THÀNH** | Hỗ trợ 5 Roles: `ADMIN`, `MANAGER`, `CASHIER`, `KITCHEN`, `WAITER`. Có bộ Jest Unit Test cho `RolesGuard`. |
| **UC03** | Quản lý nhân viên chi nhánh | Auth / POS Web | **ĐÃ HOÀN THÀNH** | Xem danh sách, tạo mới, khóa/mở khóa tài khoản; `MANAGER` chỉ quản lý nhân viên thuộc chi nhánh mình. |
| **UC04** | Đặt món tại bàn qua QR Code (Dine-in) | Customer Web | **ĐÃ HOÀN THÀNH** | Mô hình **Post-pay (Thanh toán sau)**. Khách chọn món gửi bếp trực tiếp, tự động nhận diện bàn qua URL (`?branchId=&tableId=`), fallback Mobile-first sang trọng. |
| **UC05** | Tạo đơn hàng tại quầy (POS) | POS Web / Order | **ĐÃ HOÀN THÀNH** | Chọn món, chọn Size, Topping, ghi chú, đổi loại đơn (Tại bàn / Mang về). |
| **UC06** | Chiết khấu đơn hàng tại giỏ hàng | POS Web / Order | **ĐÃ HOÀN THÀNH** | Tích hợp trực tiếp tại `OrderPanel.tsx`: hỗ trợ chọn chiết khấu theo `%` hoặc `VNĐ`, tính trừ tự động ra `finalTotal`. |
| **UC07** | Thanh toán đơn hàng tại quầy POS | POS Web / Order | **ĐÃ HOÀN THÀNH** | `PaymentModal.tsx` tinh giản: Hỗ trợ Tiền mặt (mệnh giá nhanh, tính tiền thối lại) và VietQR PayOS động. |
| **UC08** | In hóa đơn thanh toán (Receipt) | POS Web | **ĐÃ HOÀN THÀNH** | In nhiệt khổ 80mm qua React Portal + CSS `@media print`: Tạm tính, Chiết khấu, Tổng cộng, Tiền khách đưa, Tiền thối. |
| **UC09** | Hủy đơn hàng tạm chưa thanh toán | POS Web / Order | **ĐÃ HOÀN THÀNH** | Endpoint `DELETE /orders/:id` dọn dẹp đơn tạm khi đóng modal, có điều kiện chặn không cho xóa đơn đã hoàn thành. |
| **UC10** | Điều phối chế biến Bếp Realtime (KDS) | KDS Web / Order | **ĐÃ HOÀN THÀNH** | Đồng bộ Socket.IO sự kiện `NEW_ORDER_CREATED`, cập nhật trạng thái món ("Bắt đầu làm", "Hoàn thành") kèm đồng hồ đếm giờ. |
| **UC11** | Thông báo món sẵn sàng phục vụ | Order / POS Web | **ĐÃ HOÀN THÀNH** | KDS bấm hoàn thành món, server emit `ITEM_READY` tới POS Web hiển thị Toast thông báo và badge chuông thông báo. |
| **UC12** | Quản lý sơ đồ bàn ăn chi nhánh | POS Web / Branch | **ĐÃ HOÀN THÀNH** | Hiển thị trực quan bàn trống / bàn đang phục vụ, bấm vào bàn phục vụ để xem chi tiết và mở thanh toán nhanh. |
| **UC13** | Tự động trừ kho theo công thức (SAGA) | Inventory / Order| **ĐÃ HOÀN THÀNH** | Lắng nghe `order_completed` qua RabbitMQ, trừ kho bằng TypeORM Transaction, tự động rollback nếu thiếu nguyên liệu. Có Jest Unit Test. |
| **UC14** | Quản lý nguyên vật liệu & Nhập kho | Inventory / POS | **ĐÃ HOÀN THÀNH** | Danh mục nguyên liệu, đơn vị tính, nhập kho cập nhật số lượng tồn tức thì. |
| **UC15** | Chuẩn hóa kiểu dữ liệu số thực thể | Toàn hệ thống | **ĐÃ HOÀN THÀNH** | Cấu hình `columnNumericTransformer` loại bỏ hoàn toàn lỗi hiển thị số dư chuỗi `.00` từ database PostgreSQL decimal. |
| **UC16** | Bền vững hóa dữ liệu Docker Compose | Hạ tầng Devops | **ĐÃ HOÀN THÀNH** | Cấu hình Named Persistent Volumes cho RabbitMQ và 6 Database PostgreSQL, chống mất dữ liệu khi restart/rebuild container. |
| **UC17** | Kiểm thử tự động (Unit Testing) | Toàn hệ thống | **ĐÃ HOÀN THÀNH** | Xây dựng bộ Jest Unit Tests toàn diện: kiểm thử phân quyền RBAC Guard (`roles.guard.spec.ts`) và kiểm thử tính toàn vẹn Transaction trừ kho/rollback khi thiếu nguyên liệu (`inventory.service.spec.ts`). |
| **UC18** | Luồng Khách hàng Toàn diện & Realtime Sync | Customer / POS | **ĐÃ HOÀN THÀNH** | Quét QR tự nhận diện bàn, gọi nhiều đợt, xem danh sách "Món đã gọi", gộp hóa đơn tại POS khi thanh toán và tự động giải phóng bàn real-time qua sự kiện Socket.IO `table:completed`. |
| **UC19** | Quản lý Ca làm việc & Tiền két đầu ca | POS Web / Order | **ĐÃ HOÀN THÀNH** | Thu ngân bắt buộc chọn ca (`Ca 1 (06:00 - 14:00)` hoặc `Ca 2 (14:00 - 22:00)` tự động gợi ý theo giờ hệ thống) khi đăng nhập. Nhập số tiền trong két nhận bàn giao đầu ca (`initialCash`) qua bộ gõ Input Mask mượt mà (tự định dạng dấu chấm `1.000.000 đ`, hỗ trợ xóa Backspace tự nhiên) và lưu phiên ca `pos_shift` (`shiftCode`, `shiftName`, `openedAt`, `cashierName`, `initialCash`). Hiển thị badge ca làm việc trên Header. |
| **UC20** | Quản lý Phiếu chi tiền mặt tại két (Cash Out) | POS / Order / Gateway | **ĐÃ HOÀN THÀNH** | Cho phép thu ngân tạo phiếu chi tiền mặt khẩn cấp (`POST /orders/expenses`): nhập số tiền chi, lý do, người nhận; lưu vào bảng `expenses` trong `order_db`. Hỗ trợ in tức thời **Phiếu chi nhiệt 80mm** có đầy đủ chữ ký người lập và người nhận qua iframe ẩn; tích hợp nút in lại (Printer) tại từng dòng trong báo cáo. Form sạch sẽ, không dùng placeholder gây nhiễu. |
| **UC21** | Báo cáo kết ca & Đối soát tiền két 3 chiều | POS Web / Order | **ĐÃ HOÀN THÀNH** | Báo cáo vận hành tức thời (`GET /orders/shift-summary`) trả về `totalRevenue`, `totalCash`, `totalBankTransfer`, `totalExpense`, mảng `expenses` và `recentOrders`. Giao diện hiển thị thẻ chi phí màu Rose/Red, công thức chốt két vật lý: $\text{closingCash} = \text{initialCash} + \text{totalCash} - \text{totalExpense}$, và in **Phiếu bàn giao kết ca 80mm** chuẩn mẫu chữ ký 2 bên. |
| **UC22** | Thanh Side Menu Drawer & Top Header Tối Giản | POS Web | **ĐÃ HOÀN THÀNH** | Tối giản thanh Top Header (loại bỏ logo "N70 POS", chuyển chi nhánh, username và ca trực vào Side Drawer; bắt đầu bằng nút ☰, tab Bán hàng và nút Badge Đơn tạm tính). Khi bấm ☰, Side Menu Drawer trượt mượt mà từ mép trái (`w-80`, backdrop mờ): Header nổi bật (gradient xanh CukCuk `from-blue-600 via-blue-700 to-sky-600`, nút [✕], Avatar tròn, Tên hiển thị, Chi nhánh, Badge ca trực nhấp đổi ca), Body (Lịch sử đơn hàng, Hóa đơn tạm tính, Báo cáo kết ca, Tạo phiếu chi tiền mặt, Chấm công Kiosk, Quản lý kho, Quản lý ca, Quản lý nhân sự), Footer (Đăng xuất hệ thống và phiên bản). |
| **UC23** | Quản lý Ca làm việc động & Fallback offline | Order / POS Web | **ĐÃ HOÀN THÀNH** | Entity `Shift` (`code`, `name`, `startTime`, `endTime`, `gracePeriodMinutes`, `isActive`). Cho phép CRUD ca làm việc chuẩn, tự động nạp danh sách ca động từ database, tự động gợi ý ca thông minh theo giờ hệ thống (0h - 23h59), cơ chế dự phòng (Offline Fallback) tự sinh ca cục bộ khi mất mạng và kiểm soát phân quyền RBAC (`ADMIN`, `MANAGER`, `CASHIER`). |
| **UC24** | Chấm công Sinh trắc học AI Kiosk tại quầy | Order / POS Web / AI | **ĐÃ HOÀN THÀNH** | Kiosk POS dùng chung cho toàn bộ nhân sự tại quầy. Nhận diện khuôn mặt 1:1 bằng Client-side AI (`@vladmandic/face-api`, SSD MobileNet V1, 68 landmarks, 128D embeddings vector, khoảng cách Euclid < 0.500 chống chấm công hộ 100%). Check-in, Check-out, tính `workingHours`, tự động xác định trạng thái `ON_TIME` / `LATE` theo `gracePeriodMinutes`, chụp ảnh snapshot đối soát và giải pháp bù trừ un-mirror text trên video canvas. |
| **UC25** | Hợp nhất Trung tâm Quản trị Nhân sự & Bảng công | POS Web / Order / Auth | **ĐÃ HOÀN THÀNH** | Hợp nhất vào một màn hình duy nhất `TimesheetModal.tsx` gồm 3 Tab: Tab 1 "Bảng chấm công" (Timesheet & Snapshot đối soát theo ngày/tháng/nhân viên); Tab 2 "Hồ sơ Nhân viên & Sinh trắc học" (CRUD nhân sự, chụp webcam/upload ảnh thẻ để trích xuất và lưu vector khuôn mặt 128D); Tab 3 "Tài khoản hệ thống" (Quản lý User login POS/Admin, "Tên hiển thị", phân quyền và khóa/mở khóa tài khoản). |
| **UC26** | Tự động sinh Mã nhân viên thông minh | Order / Gateway / POS | **ĐÃ HOÀN THÀNH** | Endpoint `GET /employees/next-code` (RPC `'get_next_employee_code'`) tự động truy vấn mã lớn nhất theo quy tắc `NV%` của chi nhánh, tách số, tăng 1 và format dạng `NV${String(nextNum).padStart(2, '0')}` (bắt đầu từ `NV01`). Form tạo nhân viên đặt ô mã NV ở trạng thái `readOnly` kèm badge "TỰ ĐỘNG SINH", loại bỏ 100% lỗi trùng mã nhân sự do gõ thủ công. |
| **UC27** | Chấm công Kiosk độc lập tại Màn hình Đăng nhập | Gateway / POS Web | **ĐÃ HOÀN THÀNH** | Bổ sung nút viền xanh nét đứt "⏰ Chấm công Kiosk (Nhận diện khuôn mặt)" ngay tại `LoginScreen.tsx` và nút bấm 1-chạm viền xanh/nền sky gradient trên `Header.tsx`. Cấu hình decorator `@Public()` cho `POST /attendances/check-in`, `POST /attendances/check-out` và `GET /employees` (fallback `branchId = '1'`), cho phép nhân viên vào ca độc lập trước khi mở phiên bán hàng quầy POS mà không yêu cầu JWT Token. |
| **UC28** | Chuẩn hóa Giao diện Tối ưu Thao tác Vận hành Quầy | POS Web | **ĐÃ HOÀN THÀNH** | Loại bỏ toàn bộ các chuỗi placeholder gây hiểu lầm trong modal Chi tiền mặt (`ExpenseModal.tsx`), tự động reset rỗng form khi mở. Chuẩn hóa Dropdown Menu trên Header và Side Drawer dạng Flex-row 1 dòng, loại bỏ text mô tả phụ màu xám, tạo cảm giác chuyên nghiệp, tinh giản và tránh phân tâm cho thu ngân. |
| **UC29** | Lưu & Quản lý Hóa đơn Tạm tính (Hold / Draft Orders) | POS Web | **ĐÃ HOÀN THÀNH** | Tích hợp nút `[ 💾 Lưu tạm ]` tại chân giỏ hàng `OrderPanel.tsx` (tự động sinh mã `#TAM-01`, `#TAM-02`..., lưu `localStorage` `pos_held_orders`, clear giỏ và bật toast). Nút Badge `[ 📄 Đơn tạm tính (N) ]` trên Top Header nhấp nháy `animate-pulse` khi $N > 0$. Slide Drawer `HeldOrdersDrawer.tsx` trượt từ cạnh phải hỗ trợ: xem chi tiết món, tổng tiền xanh đậm in đậm, phục hồi đơn vào giỏ kèm cảnh báo ghi đè nếu giỏ đang có món, hủy 1 đơn hoặc hủy tất cả đơn tạm. |
| **UC30** | Chuẩn hóa Bảng màu CukCuk POS & Khắc phục Unit Test RolesGuard | POS Web / Gateway | **ĐÃ HOÀN THÀNH** | Refactor 100% mã nguồn `frontend/pos-web` từ Cam/Hổ phách sang tông Xanh dương CukCuk (`#0070ba`, `blue-600`, `sky-600`) & Trắng sáng (`bg-white`, `bg-zinc-50`). Tinh chỉnh `RolesGuard` trong `api-gateway` ném `ForbiddenException('No role found')` chuẩn NestJS khi request không có user/role, đảm bảo 100% bộ Jest Unit Test (`roles.guard.spec.ts`) vượt qua. |

---

## 5. Các Quyết Định Kỹ Thuật Quan Trọng (Key Architectural & Business Decisions)

### Quyết định 1: Chuyển đổi sang mô hình Thanh toán sau (Post-pay) cho khách ăn tại bàn
* **Bối cảnh:** Trước đây `customer-web` cho phép khách thanh toán trực tuyến PayOS ngay tại bàn khi đặt món.
* **Vấn đề:** Không phù hợp với thói quen tiêu dùng F&B tại Việt Nam (khách thường gọi thêm món trong bữa ăn, dùng bữa xong mới thanh toán tại quầy thu ngân).
* **Giải pháp:** Gỡ bỏ thanh toán trực tuyến tại `customer-web`. Khách gửi đơn trực tiếp đến bếp và thanh toán một lần duy nhất tại quầy thu ngân của POS khi ra về.

### Quyết định 2: Đưa khối Chiết khấu (Discount) ra chân giỏ hàng `OrderPanel.tsx`
* **Bối cảnh:** Chiết khấu trước đây nằm ẩn bên trong `PaymentModal.tsx`.
* **Vấn đề:** Thu ngân khó xem trước số tiền giảm trước khi mở modal; không hỗ trợ giảm theo số tiền VNĐ cụ thể.
* **Giải pháp:** Đưa ô nhập chiết khấu ra chân giỏ hàng nằm giữa "Tạm tính" và "Tổng thanh toán". Cho phép linh hoạt chọn giữa `%` và `VNĐ`. `PaymentModal` được tinh giản chỉ nhận số tiền cuối cùng cần thu.

### Quyết định 3: Khắc phục lỗi mất món khi thanh toán bằng cơ chế Lazy Creation & Delete Temp Order
* **Bối cảnh:** Người dùng mở modal thanh toán, sau đó đóng lại rồi chọn thêm món mới vào giỏ.
* **Vấn đề:** Modal trước đây đã tạo đơn non và lưu `orderId` cũ, dẫn đến việc đơn thanh toán chỉ chứa các món cũ, bỏ quên món mới chọn.
* **Giải pháp:** Chỉ tạo đơn hoặc xác nhận thanh toán khi thu ngân thực sự nhấn "Xác nhận". Bổ sung endpoint `DELETE /orders/:id` để dọn dẹp đơn tạm nếu khách đóng modal QR mà chưa thanh toán.

### Quyết định 4: Sử dụng TypeORM `columnNumericTransformer`
* **Bối cảnh:** PostgreSQL lưu số tiền dạng `decimal(10,2)` trả về JavaScript dưới dạng chuỗi (ví dụ: `"40000.00"`).
* **Vấn đề:** Giao diện POS bị lỗi hiển thị số tiền có đuôi `.00` ở ô nhập tiền khách đưa.
* **Giải pháp:** Áp dụng bộ chuyển đổi số học tự động convert chuỗi decimal thành số nguyên/thực trong JavaScript ở toàn bộ các Entity liên quan (`Order`, `OrderItem`, `OrderItemTopping`, `Payment`, `Expense`).

### Quyết định 5: Hợp nhất vật lý đơn gọi nhiều đợt khi thanh toán bàn (`processTablePayment`)
* **Bối cảnh:** Khách tại bàn gọi nhiều đợt trong bữa ăn (đợt 1 gọi đồ uống, đợt 2 gọi thêm món ăn).
* **Vấn đề:** Nếu lưu các đợt gọi thành các hóa đơn riêng lẻ, khi in hóa đơn và tra cứu lịch sử đơn hàng (`OrderHistory`), thu ngân sẽ thấy các đơn bị chia nhỏ, không phản ánh đúng một phiên dùng bữa của khách. Tuy nhiên, nếu gộp theo khoảng thời gian giả định (heuristic), hệ thống lại gộp nhầm các lượt khách khác nhau ngồi cùng một bàn.
* **Giải pháp:** Thực hiện hợp nhất vật lý chính xác tại thời điểm thu ngân bấm thanh toán: chuyển toàn bộ món của các đợt sau sang đơn chính (`primaryOrder`), tính tổng tiền chung, lưu thanh toán và xóa các đơn phụ rỗng. Cơ chế này chỉ áp dụng cho các đơn đang ACTIVE (`status != COMPLETED`), tuyệt đối không đụng đến các đơn đã hoàn thành trước đó của bàn.

### Quyết định 6: Đồng bộ hai chiều Real-time và Giải phóng bàn (`table:completed`)
* **Bối cảnh:** Khi bàn được thanh toán tại quầy POS, ứng dụng của khách trên điện thoại cần biết bàn đã kết thúc để không hiển thị đơn cũ nữa.
* **Vấn đề:** Khách hàng tiếp theo ngồi vào bàn đó có thể thấy đơn của khách trước nếu không có cơ chế reset tức thì.
* **Giải pháp:** Sau khi hoàn tất thanh toán bàn, `order-service` phát sự kiện Socket.IO `table:completed` tới room của chi nhánh. `customer-web` nhận tín hiệu lập tức đóng Drawer món đã gọi, xóa trắng giỏ hàng và reset trạng thái bàn; đồng thời `pos-web` cập nhật màu bàn trên Sơ đồ bàn về trạng thái Trống.

### Quyết định 7: Quản lý Ca làm việc & Báo cáo kết ca vận hành tức thời (Shift Summary)
* **Bối cảnh:** Khi giao ca, thu ngân cần đối chiếu tiền mặt thực tế trong két và tiền chuyển khoản VietQR trong ca làm việc để bàn giao cho ca sau.
* **Vấn đề:** Nếu dùng Reporting Service tổng hợp theo batch định kỳ thì số liệu không phản ánh kịp thời các giao dịch vừa phát sinh; ngoài ra nếu lọc cố định từ 00:00:00 thì không phân tách được giữa Ca 1 và Ca 2.
* **Giải pháp:** 
  1. Yêu cầu Thu ngân chọn Ca làm việc (`Ca 1 (06:00 - 14:00)` hoặc `Ca 2 (14:00 - 22:00)`) khi đăng nhập, hệ thống tự động gợi ý ca dựa trên giờ hiện tại và lưu phiên ca `pos_shift` (`shiftCode`, `shiftName`, `openedAt`, `cashierName`).
  2. Báo cáo kết ca được truy vấn trực tiếp từ `order-service` thông qua API Gateway với bộ lọc khoảng thời gian UTC `fromDate` (thời điểm mở ca thực tế) đến `toDate` (thời điểm kết ca).
  3. Ghi nhận `cashierId` đồng loạt vào toàn bộ các đơn của bàn khi thanh toán gộp bàn (`processTablePayment`) và cho phép truy vấn tương thích cả các đơn QR đặt tại bàn không gán thu ngân (`cashierId IS NULL`).
  4. Hỗ trợ xuất mẫu in nhiệt 80mm với đầy đủ thông tin chi nhánh, thu ngân, ca trực, giờ mở/đóng ca, phân tách doanh thu theo phương thức thanh toán và các dòng chữ ký xác nhận bàn giao.

### Quyết định 8: Quản lý Dòng tiền Chi tiền mặt (Cash Out) và Công thức Chốt két 3 chiều
* **Bối cảnh:** Trong thực tế vận hành quán cà phê/nhà hàng, nhân viên thu ngân thường xuyên phải trích tiền mặt từ két để thanh toán các khoản chi phí phát sinh khẩn cấp (mua thêm đá cây khi hết đá vào giờ cao điểm, mua chanh/sả tươi tại chợ lân cận, mua nước ngọt, trả phí giao hàng...).
* **Vấn đề:** Nếu không có cơ chế ghi nhận tức thì trên phần mềm POS, đến cuối ca kiểm két sẽ bị hụt tiền mặt ("lệch két") so với tổng số tiền thu trên phần mềm, dẫn đến khó khăn trong đối soát và quy trách nhiệm giữa các ca.
* **Giải pháp:**
  1. Xây dựng Entity `Expense` và các endpoint `POST /orders/expenses`, `GET /orders/expenses` để ghi nhận phiếu chi kèm lý do và người nhận tiền.
  2. Xây dựng modal `ExpenseModal.tsx` trên POS Web với bộ gõ Input Mask mượt mà và nút "Lưu & In phiếu chi" nhiệt 80mm để ký nhận và kẹp vào két. Form được làm sạch hoàn toàn các placeholder gây hiểu lầm cho người dùng.
  3. Bổ sung bảng kê phiếu chi vào `ShiftSummaryModal.tsx` kèm nút in lại từng phiếu khi cần kiểm tra lại chứng từ.

### Quyết định 9: Tính độc lập giữa Doanh thu Bán hàng (`totalRevenue`) và Kiểm kê Tiền két (`closingCash`)
* **Bối cảnh:** Khi có khoản chi tiền mặt (`totalExpense`) lấy từ két, phát sinh câu hỏi: Doanh thu ca trực có bị trừ bớt khoản tiền chi này hay không?
* **Quy chuẩn Kế toán:** Doanh thu bán hàng (Revenue) phản ánh tổng giá trị sản phẩm/dịch vụ mà quán đã bán ra cho khách hàng trong ca. Chi phí mua đá, nguyên liệu (Expenses) là chi phí vận hành (OPEX). Theo nguyên lý kế toán kép, chi phí không được cấn trừ trực tiếp vào doanh thu gộp khi chốt ca bán hàng.
* **Giải pháp Kỹ thuật:**
  - **Tổng doanh thu bán hàng trong ca:** $\text{totalRevenue} = \text{totalCash} + \text{totalBankTransfer}$ (Giữ nguyên vẹn, phản ánh chính xác kết quả kinh doanh).
  - **Tổng tiền mặt trong két thực tế:** $\text{closingCash} = \text{initialCash} + \text{totalCash} - \text{totalExpense}$ (Trừ chính xác khoản tiền mặt đã trích ra khỏi két để đảm bảo số đếm tiền vật lý khớp 100% với số liệu chốt két).

### Quyết định 10: Cơ chế In nhiệt 80mm bằng Hidden Iframe cho Phiếu chi và Phiếu kết ca
* **Bối cảnh:** Trong các ứng dụng Web SPA (React/Vite), khi in hóa đơn thường sử dụng CSS `@media print` ẩn các phần tử giao diện (`#root { display: none !important; }`) và chỉ hiển thị khối in.
* **Vấn đề:** Một số trình duyệt Chromium hoặc thư viện React Modal khi mở lớp phủ (`fixed inset-0`) có thể gây xung đột CSS print, khiến lệnh `window.print()` in ra trang trắng hoặc không mở được hộp thoại in.
* **Giải pháp:** Áp dụng phương pháp tạo một thẻ `<iframe>` ẩn độc lập trong DOM (`document.createElement('iframe')`), ghi nội dung tài liệu in nhiệt 80mm tự thân (self-contained HTML với khổ `@page { size: 80mm auto; margin: 0; }`), kích hoạt lệnh `iframe.contentWindow.print()` và tự động tháo gỡ iframe khỏi DOM sau khi in. Phương pháp này hoạt động ổn định 100% trên tất cả các trình duyệt và máy in nhiệt POS thông dụng.

### Quyết định 11: Lưu trữ Entity `Employee` và `Attendance` tại `order_db` thay vì tách Service riêng
* **Bối cảnh:** Nghiệp vụ vận hành tại quầy yêu cầu quản lý nhân sự cửa hàng (Thu ngân, Pha chế, Phục vụ), phân ca làm việc (`Shift`) và ghi nhận dữ liệu chấm công (`Attendance`).
* **Vấn đề:** Nếu tách ra một microservice riêng (`hr-service`) hoặc đưa vào `auth-service`:
  1. Gây ra độ trễ mạng phân tán (Network overhead) và phức tạp hóa việc đồng bộ khi đối soát kết ca: Báo cáo kết ca thu ngân cần kiểm tra đối chiếu trực tiếp giữa phiên ca (`pos_shift`), nhân sự phụ trách (`cashierId`) và các hóa đơn bán hàng.
  2. Trạm Kiosk POS quầy cần tốc độ phản hồi cực nhanh (< 100ms) khi nhân viên vào/tan ca để không gây nghẽn tại quầy thu ngân.
* **Giải pháp Kỹ thuật:**
  - Tích hợp trực tiếp các Entity `Shift`, `Employee` và `Attendance` vào cơ sở dữ liệu vận hành quầy (`order_db`) do `order-service` quản lý.
  - Tận dụng sức mạnh của **ACID Transactions** nội bộ trong PostgreSQL: khi mở ca, chốt ca, gắn thu ngân vào đơn hàng, hoặc ghi nhận ca làm việc thực tế, hệ thống truy vấn tức thì mà không cần distributed locks hay hai pha commit (2PC).
  - Tách bạch rõ rệt vai trò: `auth-service` / `auth_db` chỉ chịu trách nhiệm xác thực bảo mật tài khoản đăng nhập (Username, Password băm Bcrypt, JWT Token), còn `order-service` / `order_db` đảm nhiệm toàn bộ thực thể vận hành vật lý tại quầy (Ca trực, Nhân viên, Chấm công, Đơn hàng, Phiếu chi).

### Quyết định 12: Nhận diện Sinh trắc học AI 1:1 Client-side bằng `@vladmandic/face-api` và Bù trừ Un-mirror Canvas
* **Bối cảnh:** Vấn nạn chấm công hộ (buddy punching) gây thất thoát chi phí lớn cho các chuỗi F&B. Các giải pháp truyền video/ảnh lên máy chủ đám mây để AI phân tích đòi hỏi hạ tầng GPU tốn kém, tiêu tốn băng thông đường truyền và có nguy cơ vi phạm bảo mật dữ liệu sinh trắc học cá nhân.
* **Giải pháp Kỹ thuật:**
  1. **Edge AI Client-side:** Sử dụng `@vladmandic/face-api` chạy trực tiếp trên trình duyệt máy POS (`pos-web`) thông qua WebGL/WASM. Các mô hình mạng nơ-ron tích chập (SSD MobileNet V1 phát hiện khuôn mặt, 68 Landmarks định vị mắt mũi miệng, và ResNet-34 Face Recognition trích xuất vector 128 số thực float) được tải vào bộ nhớ máy POS và thực thi liên tục 200ms/frame.
  2. **So khớp 1:1 theo Khoảng cách Euclid (Euclidean Distance):** Khi nhân viên chọn mã NV của mình trên Kiosk, hệ thống chỉ cần tính khoảng cách vector giữa khuôn mặt trước camera và vector mẫu đã nạp lúc đăng ký:
     $$d = \sqrt{\sum_{i=1}^{128} (A_i - B_i)^2}$$
     Ngưỡng chấp nhận được cố định ở mức $d < 0.500$. Nếu $d \ge 0.500$, Kiosk lập tức hiển thị cảnh báo đỏ và vô hiệu hóa nút "Vào ca" / "Tan ca", loại bỏ 100% tình trạng chấm công hộ mà không cần gửi dữ liệu video lên server.
  3. **Giải pháp Bù trừ tọa độ Un-mirror Canvas:**
     - Video Webcam được lật gương bằng CSS `-scale-x-100` (`transform: scaleX(-1)`) để nhân viên soi vào màn hình thấy chuyển động tự nhiên như nhìn gương soi.
     - Nếu vẽ trực tiếp text lên canvas này, toàn bộ chữ (VD: nhãn "Chính chủ (62% khớp)") sẽ bị lật ngược từ phải qua trái rất khó đọc.
     - **Thuật toán xử lý:** Tách biệt phép biến đổi: canvas vẽ overlay được giữ đúng kích thước video; trước khi vẽ hộp nhận diện và chữ, hệ thống đảo ngược trục X tọa độ hộp ($x_{\text{canvas}} = \text{canvasWidth} - x_{\text{box}} - \text{width}_{\text{box}}$) trên một canvas phụ hoặc thực hiện `ctx.scale(-1, 1)` cục bộ và bù trừ tọa độ tương ứng. Nhờ vậy, khung viền bám khít khuôn mặt chuyển động theo hiệu ứng gương, nhưng toàn bộ chữ hiển thị xuôi chiều đọc tự nhiên từ trái sang phải.

### Quyết định 13: Cơ chế Tự động sinh Mã Nhân viên Thông minh `NVxx` Chống Trùng lặp
* **Bối cảnh:** Khi thêm mới nhân viên vào chi nhánh, việc cho phép quản trị viên tự gõ mã nhân viên thủ công dễ dẫn đến trùng lặp mã (`NV01`, `nv01`, `NV1`...), gây lỗi Unique Constraint trong database và xáo trộn quản lý.
* **Giải pháp Kỹ thuật:**
  1. Backend cung cấp endpoint `GET /employees/next-code` (RPC pattern `'get_next_employee_code'`).
  2. `EmployeeService` truy vấn danh sách nhân sự của chi nhánh có tiền tố `NV%`, dùng biểu thức chính quy (Regex) bóc tách phần số nguyên lớn nhất:
     $$\text{nextCode} = \text{'NV'} + \text{String}(\max(\text{numbers}) + 1)\text{.padStart}(2, \text{'0'})$$
     Nếu chưa có nhân viên nào, hệ thống trả về mã khởi đầu chuẩn `NV01`.
  3. Form thêm nhân sự mới trên `TimesheetModal.tsx` tự động gọi API lấy mã gợi ý, hiển thị ô nhập với thuộc tính `readOnly` và badge "TỰ ĐỘNG SINH", ngăn chặn triệt để thao tác nhập nhầm của người dùng.

### Quyết định 14: Kiến trúc Chấm công Kiosk Hai cấp (Public Pre-login & Header Post-login)
* **Bối cảnh:** Trong thực tế vận hành quán cà phê, nhân viên ca sáng (pha chế, phục vụ) thường có mặt lúc 06:00 để chuẩn bị nguyên liệu và dọn dẹp trước giờ mở cửa. Trong khi đó, thu ngân phụ trách mở ca POS có thể đến lúc 06:30.
* **Vấn đề:** Nếu Kiosk chấm công bắt buộc thu ngân phải đăng nhập POS trước thì các nhân viên đến sớm không thể check-in vào ca đúng giờ.
* **Giải pháp Kỹ thuật:**
  1. **Tầng Pre-login (Trước đăng nhập):** Bổ sung nút viền xanh nét đứt "⏰ Chấm công Kiosk (Nhận diện khuôn mặt)" trực tiếp tại màn hình `LoginScreen.tsx`.
  2. **Bypass JWT Bảo mật:** Gắn decorator `@Public()` cho các endpoint `POST /attendances/check-in`, `POST /attendances/check-out` và `GET /employees` (có fallback `branchId = '1'`). Các `JwtAuthGuard` và `RolesGuard` tại API Gateway tự động cho phép request đi qua mà không cần Header `Authorization: Bearer <token>`.
  3. **Bảo mật Thay thế (Alternative Security Layer):** Luồng chấm công Kiosk không cấp phát quyền truy cập dữ liệu kinh doanh mà chỉ thực hiện ghi nhận thời gian vào/tan ca; bảo mật được đảm bảo vững chắc bằng 2 yếu tố: Nhận diện khuôn mặt AI (Face Verification) + Mã PIN bảo mật 4-6 số của chính nhân viên.
  4. **Tầng Post-login (Sau đăng nhập):** Thu ngân sau khi đăng nhập vẫn có thể kích hoạt Kiosk chấm công bất kỳ lúc nào bằng nút 1-chạm viền xanh/nền sky gradient trên Header của POS Web.

### Quyết định 15: Tinh giản Nhận thức Thị giác (Cognitive Load Reduction) cho Giao diện Quầy
* **Bối cảnh:** Môi trường quầy thu ngân F&B vào giờ cao điểm đòi hỏi tốc độ thao tác cực kỳ nhanh, chính xác và không có yếu tố gây phân tâm.
* **Giải pháp Kỹ thuật:**
  1. **Top Header Siêu Tinh Gọn:** Loại bỏ chữ logo "N70 POS", đưa nút menu ☰, tab "Bán hàng" và nút Badge "Đơn tạm tính" lên vị trí khởi đầu góc trái; chuyển toàn bộ thông tin chi nhánh, tài khoản và badge ca trực vào Side Drawer. Góc phải chỉ giữ lại: Nút Kiosk 1-chạm, Trạng thái kết nối, Chuông thông báo và Nút Đăng xuất.
  2. **Thanh Trượt Side Menu Drawer:** Thay thế popup dropdown bằng Side Drawer trượt từ mép trái (`w-80`, backdrop mờ, transition mượt mà):
     - **Profile & Session Card (Header Drawer):** Nền gradient xanh CukCuk `from-blue-600 via-blue-700 to-sky-600` nổi bật, avatar tròn, tên hiển thị in đậm, chi nhánh và badge ca trực có thể nhấp đổi ca.
     - **Thân Drawer:** Danh mục nghiệp vụ quầy và quản trị hệ thống rõ ràng, phân nhóm trực quan, đồng bộ dạng Flex-row 1 dòng không mô tả phụ.
     - **Footer:** Nút đăng xuất an toàn và thông tin phiên bản.
  3. **Modal Phiếu Chi Tiền Mặt (`ExpenseModal.tsx`):** Loại bỏ hoàn toàn các chuỗi placeholder giả định ("Ví dụ: Mua 2 bao đá viên...", "Ví dụ: Anh Ba giao đá..."). Khi mở modal, toàn bộ ô nhập liệu hiển thị trạng thái trắng sạch, giúp thu ngân nhận biết ngay vị trí cần gõ mà không bị ảo giác thị giác do placeholder màu mờ gây ra.

### Quyết định 16: Kiến trúc Quản lý Hóa đơn Tạm tính tại Quầy (Hold Orders Context & Slide Drawer)
* **Bối cảnh:** Trong giờ cao điểm bán hàng tại quầy F&B, khách hàng A đang gọi món nhưng phân vân đổi ý hoặc cần chờ người đi cùng chọn thêm, trong khi khách hàng B đã sẵn sàng thanh toán ngay. Nếu thu ngân phải xóa giỏ hàng hoặc chờ đợi thì hàng đợi sẽ bị ùn tắc nghiêm trọng.
* **Giải pháp Kỹ thuật:**
  1. **Nút "Lưu tạm" tại Chân Giỏ hàng:** Bổ sung nút `[ 💾 Lưu tạm ]` tại chân `OrderPanel.tsx` cạnh nút "Gửi bếp" và "Thanh toán". Nút tự động vô hiệu hóa (`disabled`) khi giỏ hàng rỗng.
  2. **Cơ chế Snapshot & Tự sinh mã `#TAM-xx`:**
     - Khi bấm "Lưu tạm", hệ thống chụp snapshot toàn bộ dữ liệu đơn: `id` (UUID), `code` (`#TAM-01`, `#TAM-02`... tự tăng dần theo ngày), `createdAt` (`HH:mm:ss`), `orderType`, `tableId`, mảng `items`, `subtotal`, `discountType`, `discountInput`, `discountAmount`, `finalTotal` và ghi chú.
     - Lưu trữ bền vững tại `localStorage` với key `pos_held_orders`, đảm bảo không mất dữ liệu ngay cả khi F5 tải lại trang.
     - Tự động làm sạch giỏ hàng hiện tại và hiển thị thông báo Toast thành công.
  3. **Badge Đơn Tạm tính trên Header & Drawer Quản lý:**
     - Badge `[ 📄 Đơn tạm tính (N) ]` trên Top Header hiển thị số lượng đơn đang chờ, tự động thêm hiệu ứng `animate-pulse` khi $N > 0$ để nhắc nhở thu ngân.
     - Slide Drawer `HeldOrdersDrawer.tsx` trượt từ cạnh phải màn hình (`w-96`, backdrop mờ, đóng bằng phím ESC), hiển thị thẻ từng đơn tạm với chi tiết món, giá in đậm màu xanh, nút "Phục hồi đơn", "Xóa đơn" và "Hủy tất cả đơn tạm".
  4. **Cơ chế Phục hồi & Bảo vệ Ghi đè (Safe Cart Overwrite Protection):**
     - Khi thu ngân chọn phục hồi một đơn tạm trong lúc giỏ hàng đang có món mới, hệ thống kích hoạt modal cảnh báo xác nhận ghi đè.
     - Khi đồng ý, `CartContext.loadOrderToCart` nạp toàn vẹn danh sách món, loại đơn, bàn và chiết khấu vào giỏ, đồng thời tự động xóa đơn tạm đó khỏi danh sách chờ.

### Quyết định 17: Chuẩn hóa Bảng màu Xanh - Trắng phong cách CukCuk POS (Cognitive Ergonomics)
* **Bối cảnh:** Giao diện quầy bán hàng POS trước đây sử dụng tông màu Cam/Hổ phách (Amber/Orange). Màu cam có xu hướng gây căng thẳng thị giác (visual fatigue) cho thu ngân khi nhìn liên tục 8-12 tiếng mỗi ca, đồng thời làm giảm độ tương phản với các trạng thái cảnh báo khẩn cấp (màu vàng cảnh báo, màu đỏ lỗi).
* **Giải pháp Kỹ thuật:**
  1. **Bảng màu Chuẩn CukCuk POS:** Chuyển đổi toàn diện sang tông Xanh dương chủ đạo (`#0070ba`, `blue-600`, `sky-600`) kết hợp Trắng sáng (`bg-white`) và Xám trung tính (`bg-zinc-50`, `border-zinc-200`).
  2. **Hiệu ứng Tâm lý Thị giác:** Màu xanh dương mang lại cảm giác ổn định, chuyên nghiệp, tin cậy và dịu mắt, giúp nhân viên tập trung cao độ trong các thao tác tính tiền nhanh.
  3. **Phân cấp Tương phản Rõ nét:** Nút hành động chính (Primary Call-to-Action) nổi bật trên nền xanh, các trạng thái Đang phục vụ / Bàn trống được quy chuẩn màu sắc phân minh (Xanh dương - Đang phục vụ, Trắng/Xám - Trống), loại bỏ 100% dư lượng class `orange-` và `amber-`.

### Quyết định 18: Cơ chế Xử lý Ngoại lệ Tường minh trong RBAC RolesGuard (ForbiddenException)
* **Bối cảnh:** Trong kiến trúc Microservices và API Gateway của NestJS, `RolesGuard` chịu trách nhiệm kiểm tra vai trò của người dùng (`req.user.role`) so với danh sách `@Roles()`.
* **Vấn đề:** Nếu guard chỉ trả về `return false` khi `request.user` hoặc `request.user.role` không tồn tại, NestJS trong môi trường kiểm thử Unit Test (Jest) sẽ coi `canActivate` trả về giá trị boolean thay vì quăng lỗi, dẫn đến việc các test case kỳ vọng bắt ngoại lệ `ForbiddenException` bị thất bại.
* **Giải pháp Kỹ thuật:**
  - Cập nhật tường minh trong `roles.guard.ts`: Nếu không tìm thấy đối tượng `user` hoặc không có thuộc tính `role` trong request, guard chủ động ném `throw new ForbiddenException('No role found')`.
  - Nếu role không nằm trong mảng roles được cấp phép, ném `throw new ForbiddenException('User does not have the required role')`.
  - Đảm bảo 100% các bài kiểm thử đơn vị (`roles.guard.spec.ts`) vượt qua kiểm tra nghiêm ngặt mà vẫn duy trì cơ chế bảo vệ phân quyền tuyệt đối trong môi trường sản xuất.