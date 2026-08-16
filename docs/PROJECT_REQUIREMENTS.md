# PROJECT REQUIREMENTS & TECHNICAL SPECIFICATIONS
## Đề tài: Hệ thống Quản lý Vận hành cho Chuỗi Quán Cà phê / Nhà hàng Đa chi nhánh (F&B Multi-branch System)

---

## 1. TỔNG QUAN DỰ ÁN
* **Mô hình hệ thống:** Microservices Architecture (Database-per-Service)
* **Mục tiêu:** Xây dựng hệ thống quản lý tập trung cho chuỗi F&B đa chi nhánh, hỗ trợ quản trị toàn chuỗi, vận hành tại chi nhánh, đặt món qua QR Code, hiển thị nhà bếp thời gian thực (KDS) và tự động hóa kho/báo cáo qua sự kiện bất đồng bộ.

---

## 2. CÔNG NGHỆ SỬ DỤNG (TECH STACK)
* **Backend Framework:** NestJS (TypeScript) cho các Microservices và API Gateway.
* **Database:** PostgreSQL (Mỗi service quản lý một database riêng biệt: `auth_db`, `branch_db`, `product_db`, `order_db`, `inventory_db`, `reporting_db`).
* **Realtime Communication:** Socket.IO (cho màn hình KDS và POS Realtime).
* **Message Broker:** RabbitMQ (Xử lý bất đồng bộ sự kiện `order.completed` để trừ kho và ghi nhận báo cáo).
* **Infrastructure:** Docker & Docker Compose (Quản lý toàn bộ container dịch vụ và cơ sở dữ liệu).
* **Frontend (Dự kiến):** ReactJS / Vite (cho POS Client, KDS Web App, Customer QR Ordering Web).

---

## 3. CẤU TRÚC 6 MICROSERVICES CHÍNH
1. **API Gateway:** Điểm vào duy nhất cho Client, định tuyến request và xác thực JWT token.
2. **Auth Service (`auth_db`):** Quản lý tài khoản người dùng, phân quyền (Admin, Quản lý, Thu ngân, Bếp) và cấp phát JWT.
3. **Branch Service (`branch_db`):** Quản lý danh mục chi nhánh, sơ đồ bàn ăn, ca làm việc và bảng chấm công nhân viên.
4. **Product Service (`product_db`):** Quản lý thực đơn tập trung, danh mục, món ăn (kèm biến thể Size/Topping) và trạng thái bật/tắt món theo từng chi nhánh (`branch_product_availabilities`).
5. **Order Service (`order_db`):** Xử lý quy trình bán hàng tại quầy (POS), đặt món qua mã QR tại bàn, điều phối chế biến KDS Realtime qua WebSocket và xử lý thanh toán hóa đơn.
6. **Inventory Service (`inventory_db`):** Quản lý nguyên liệu thô, định mức tồn kho tối thiểu, công thức chế biến (`Recipe`) và tiêu thụ nguyên liệu tự động thông qua Event Consumer lắng nghe từ RabbitMQ.
7. **Reporting Service (`reporting_db`):** Tổng hợp và truy xuất báo cáo doanh thu đa chi nhánh, sản lượng món bán chạy và mức tiêu hao nguyên liệu.

---

## 4. DANH MỤC USE CASE CHÍNH CỦA HỆ THỐNG
* **UC01:** Đăng nhập & Xác thực hệ thống.
* **UC02:** Thanh toán đơn hàng (Kích hoạt Event RabbitMQ tới Inventory và Reporting).
* **UC03:** Tạo đơn hàng tại quầy (POS).
* **UC04 - UC08:** Quản lý tài khoản, thêm, sửa, khóa tài khoản & phân quyền.
* **UC09 - UC12:** Quản lý và xem báo cáo doanh thu, món bán chạy, tiêu hao nguyên liệu.
* **UC13 - UC17:** Quản lý kho nguyên liệu, thiết lập công thức định mức (Recipe) và kiểm kê kho.
* **UC18 - UC22:** Quản lý danh mục chi nhánh (Thêm, sửa, đổi trạng thái).
* **UC23 - UC27:** Quản lý sơ đồ bàn ăn theo chi nhánh.
* **UC28 - UC33:** Quản lý danh mục, món ăn, biến thể và bật/tắt món theo chi nhánh.
* **UC34 - UC37:** Chấm công nhân viên (Check-in/Check-out, duyệt bảng công).
* **UC38 - UC41:** Quản lý ca làm việc và phân lịch trực.
* **UC42:** Quét mã QR đặt món tại bàn (Mobile Web cho khách hàng).
* **UC43:** Điều phối chế biến KDS Realtime (Nhận sự kiện qua Socket.IO, cập nhật trạng thái "Đang làm" / "Hoàn thành").

---

## 5. YÊU CẦU SETUP REPOSITORY (DÀNH CHO AI / ANTIGRAVITY)
1. Khởi tạo cấu trúc Monorepo hoặc multi-folder gồm:
   - `api-gateway/`
   - `services/auth-service/`
   - `services/branch-service/`
   - `services/product-service/`
   - `services/order-service/`
   - `services/inventory-service/`
   - `services/reporting-service/`
2. Tạo file `docker-compose.yml` ở thư mục gốc để cấu hình chạy sẵn:
   - Các container PostgreSQL cho từng service.
   - Container RabbitMQ (gồm Management UI).
3. Cấu hình kết nối cơ sở dữ liệu và RabbitMQ cho các service bằng TypeORM / Prisma (NestJS).