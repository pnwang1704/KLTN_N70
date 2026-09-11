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
3. **Branch Service (`branch_db` - 5433):** Quản lý danh mục chi nhánh, sơ đồ bàn ăn theo trạng thái (Bàn trống, Đang phục vụ).
4. **Product Service (`product_db` - 5434):** Quản lý danh mục món ăn, giá bán cơ sở, biến thể kích thước (Size M, L), Topping và cấu hình bật/tắt món cục bộ tại từng chi nhánh (`branch_product_availabilities`).
5. **Order Service (`order_db` - 5435):** Quản lý vòng đời đơn hàng, chiết khấu (% / tiền mặt), thanh toán hóa đơn, dọn dẹp đơn tạm (`DELETE /orders/:id`) và lưu trữ Socket.IO Realtime Gateway (Port 3004).
6. **Inventory Service (`inventory_db` - 5436):** Quản lý danh mục nguyên liệu thô, định mức tồn kho an toàn, công thức chế biến (`Recipe`) và tự động trừ kho nguyên liệu bằng Database Transaction khi nhận sự kiện `order_completed`.
7. **Reporting Service (`reporting_db` - 5437):** Tổng hợp và truy xuất báo cáo doanh thu, sản lượng món bán chạy và tỷ lệ tiêu hao nguyên liệu.

---

## 4. Ma Trận Yêu Cầu & Tiến Độ Thực Hiện (Requirements Traceability Matrix)

| Mã Use Case | Tên Chức Năng / Nghiệp Vụ | Phân Hệ | Trạng Thái | Ghi Chú Kỹ Thuật Hoàn Thành |
| :--- | :--- | :--- | :--- | :--- |
| **UC01** | Đăng nhập & Xác thực hệ thống | Auth / Gateway | **ĐÃ HOÀN THÀNH** | JWT Stateless Token, mật khẩu Bcrypt, Auto-redirect theo trạng thái đăng nhập. |
| **UC02** | Phân quyền vai trò người dùng (RBAC) | Auth / Gateway | **ĐÃ HOÀN THÀNH** | Hỗ trợ 5 Roles: `ADMIN`, `MANAGER`, `CASHIER`, `KITCHEN`, `WAITER`. Có bộ Jest Unit Test cho `RolesGuard`. |
| **UC03** | Quản lý nhân viên chi nhánh | Auth / POS Web | **ĐÃ HOÀN THÀNH** | Xem danh sách, tạo mới, khóa/mở khóa tài khoản; `MANAGER` chỉ quản lý nhân viên thuộc chi nhánh mình. |
| **UC04** | Đặt món tại bàn qua QR Code (Dine-in) | Customer Web | **ĐÃ HOÀN THÀNH** | Mô hình **Post-pay (Thanh toán sau)**. Khách chọn món gửi bếp trực tiếp, màn hình thành công hiển thị số bàn và mã đơn. |
| **UC05** | Tạo đơn hàng tại quầy (POS) | POS Web / Order | **ĐÃ HOÀN THÀNH** | Chọn món, chọn Size, Topping, ghi chú, đổi loại đơn (Tại bàn / Mang về). |
| **UC06** | Chiết khấu đơn hàng tại giỏ hàng | POS Web / Order | **ĐÃ HOÀN THÀNH** | Tích hợp trực tiếp tại `OrderPanel.tsx`: hỗ trợ chọn chiết khấu theo `%` hoặc `VNĐ`, tính trừ tự động ra `finalTotal`. |
| **UC07** | Thanh toán đơn hàng tại quầy POS | POS Web / Order | **ĐÃ HOÀN THÀNH** | `PaymentModal.tsx` tinh giản: Hỗ trợ Tiền mặt (mệnh giá nhanh, tính tiền thối lại) và VietQR PayOS động. |
| **UC08** | In hóa đơn thanh toán (Receipt) | POS Web | **ĐÃ HOÀN THÀNH** | In nhiệt khổ 80mm qua React Portal + CSS `@media print`: Tạm tính, Chiết khấu, Tổng cộng, Tiền khách đưa, Tiền thối. |
| **UC09** | Hủy đơn hàng tạm chưa thanh toán | POS Web / Order | **ĐÃ HOÀN THÀNH** | Endpoint `DELETE /orders/:id` dọn dẹp đơn tạm khi đóng modal, có điều kiện chặn không cho xóa đơn đã hoàn thành. |
| **UC10** | Điều phối chế biến Bếp Realtime (KDS) | KDS Web / Order | **ĐÃ HOÀN THÀNH** | Đồng bộ Socket.IO sự kiện `newOrder`, cập nhật trạng thái món ("Bắt đầu làm", "Hoàn thành") kèm đồng hồ đếm giờ. |
| **UC11** | Thông báo món sẵn sàng phục vụ | Order / POS Web | **ĐÃ HOÀN THÀNH** | KDS bấm hoàn thành món, server emit `ITEM_READY` tới POS Web hiển thị Toast thông báo và badge chuông thông báo. |
| **UC12** | Quản lý sơ đồ bàn ăn chi nhánh | POS Web / Branch | **ĐÃ HOÀN THÀNH** | Hiển thị trực quan bàn trống / bàn đang phục vụ, bấm vào bàn phục vụ để xem chi tiết và mở thanh toán nhanh. |
| **UC13** | Tự động trừ kho theo công thức (SAGA) | Inventory / Order| **ĐÃ HOÀN THÀNH** | Lắng nghe `order_completed` qua RabbitMQ, trừ kho bằng TypeORM Transaction, tự động rollback nếu thiếu nguyên liệu. Có Jest Unit Test. |
| **UC14** | Quản lý nguyên vật liệu & Nhập kho | Inventory / POS | **ĐÃ HOÀN THÀNH** | Danh mục nguyên liệu, đơn vị tính, nhập kho cập nhật số lượng tồn tức thì. |
| **UC15** | Chuẩn hóa kiểu dữ liệu số thực thể | Toàn hệ thống | **ĐÃ HOÀN THÀNH** | Cấu hình `columnNumericTransformer` loại bỏ hoàn toàn lỗi hiển thị số dư chuỗi `.00` từ database PostgreSQL decimal. |
| **UC16** | Bền vững hóa dữ liệu Docker Compose | Hạ tầng Devops | **ĐÃ HOÀN THÀNH** | Cấu hình Named Persistent Volumes cho RabbitMQ và 6 Database PostgreSQL, chống mất dữ liệu khi restart/rebuild. |

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
* **Giải pháp:** Áp dụng bộ chuyển đổi số học tự động convert chuỗi decimal thành số nguyên/thực trong JavaScript ở toàn bộ các Entity liên quan (`Order`, `OrderItem`, `OrderItemTopping`, `Payment`).