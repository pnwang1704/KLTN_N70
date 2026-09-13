# Hệ thống POS & KDS Bán Hàng F&B (Khóa Luận Tốt Nghiệp)

Dự án Hệ thống Quản lý Bán hàng F&B (Food & Beverage) hiện đại, tích hợp KDS (Kitchen Display System), QR Order và POS (Point of Sale). Hệ thống được xây dựng theo kiến trúc Microservices với Node.js, React (Vite), PostgreSQL, RabbitMQ, và được đóng gói hoàn toàn bằng Docker.

## 🚀 Tính năng nổi bật
- **Customer QR Web (Mobile-First):** Quét mã QR tại bàn tự động nhận diện bàn qua URL (`?branchId=1&tableId=5`), fallback giao diện sang trọng; hỗ trợ gọi nhiều đợt trong bữa ăn và tra cứu "Món đã gọi tại bàn" (Active order drawer).
- **KDS Web:** Màn hình hiển thị bếp Realtime (đồng bộ Socket.IO sự kiện `NEW_ORDER_CREATED` và `ITEM_READY`).
- **POS Web:** Thu ngân quầy, quản lý sơ đồ bàn (đang phục vụ / bàn trống), chiết khấu linh hoạt (% và VNĐ) tại chân giỏ hàng, thanh toán bàn gộp các đợt gọi thành 1 hóa đơn và in hóa đơn nhiệt 80mm.
- **Thanh toán Đa phương thức:** Hỗ trợ Tiền mặt (tính tiền thối nhanh) và PayOS VietQR động (Webhook & Polling xác nhận tiền vào tài khoản tự động).
- **Giải phóng bàn Real-time:** Socket.IO sự kiện `table:completed` đồng bộ hai chiều giữa POS và Customer Web ngay khi thanh toán xong.
- **Persistent Storage & Microservices:** Named Persistent Volumes cho 6 database PostgreSQL và RabbitMQ, đảm bảo dữ liệu luôn bền vững khi restart/rebuild container.

---

## 🏗 Bảng Tổng hợp Hạ tầng (Infrastructure & Ports)
Toàn bộ hệ thống chạy ngầm trong một mạng nội bộ (`app-network`). Dưới đây là danh sách các Port được mở ra môi trường Host (máy thật):

| Thành phần | Công nghệ | Container Name | Port ngoài (Host) | Port trong | Named Persistent Volume |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RabbitMQ Management** | RabbitMQ | `fnb_rabbitmq` | `15672` (UI), `5672` | 15672, 5672 | `rabbitmq_data` |
| **API Gateway** | NestJS | `fnb_api_gateway` | **`3000`** | 3000 | - |
| **Order Service (Socket)** | NestJS | `fnb_order_service` | **`3004`** | 3004 | - |
| **Auth Database** | PostgreSQL | `fnb_postgres_auth` | `5432` | 5432 | `postgres_auth_data` |
| **Product Database** | PostgreSQL | `fnb_postgres_product`| `5434` | 5432 | `postgres_product_data` |
| **Order Database** | PostgreSQL | `fnb_postgres_order` | `5435` | 5432 | `postgres_order_data` |
| **Inventory Database** | PostgreSQL| `fnb_postgres_inventory`| `5436` | 5432 | `postgres_inventory_data` |
| **Branch DB** *(Pending)* | PostgreSQL | `fnb_postgres_branch` | `5437` | 5432 | `postgres_branch_data` |
| **Reporting DB** *(Pending)*| PostgreSQL | `fnb_postgres_reporting`| `5438` | 5432 | `postgres_reporting_data` |
| **KDS Web** | React + Nginx | `fnb_kds_web` | **`5173`** | 80 | - |
| **Customer QR Web** | React + Nginx | `fnb_customer_web` | **`5174`** | 80 | - |
| **POS Web** | React + Nginx | `fnb_pos_web` | **`5175`** | 80 | - |

---

## 🛠 Hướng dẫn Khởi chạy (Chỉ 1 câu lệnh)

Bạn không cần cài đặt Node.js, không cần cấu hình Database. Chỉ cần có Docker và chạy duy nhất lệnh sau tại thư mục gốc:

```bash
docker compose up --build -d
```

*(Quá trình này có thể mất 1-3 phút để biên dịch toàn bộ Microservices và Frontend. Hệ thống có cơ chế **Healthcheck** tự động chờ Database & RabbitMQ lên sóng mới khởi động Backend).*

**Lưu ý biến môi trường PayOS:** Để luồng thanh toán tự động hoạt động, cần cung cấp đủ 3 biến môi trường `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` trong file `.env` ở thư mục gốc hoặc API Gateway.

---

## 🧪 Hướng dẫn Test Luồng E2E

Sau khi các Container `Started`, mở 3 tab trình duyệt để mô phỏng thực tế:

1. **Khách hàng quét mã QR tại bàn (Customer Web):** `http://localhost:5174/?branchId=1&tableId=5`
   - Hệ thống tự động nhận diện Bàn 5 và chuyển thẳng vào màn hình Menu chọn món.
   - Chọn món, chọn Size/Topping/Ghi chú -> Bấm "Gửi đơn gọi món" (Đợt 1).
   - Tiếp tục chọn thêm món và gửi tiếp Đợt 2.
   - Bấm icon "Món đã gọi" trên Header: Drawer hiển thị gộp đầy đủ các món qua 2 đợt gọi và tổng tiền bàn.
2. **Nhà Bếp tiếp nhận chế biến (KDS):** `http://localhost:5173`
   - Đăng nhập bếp. Các đợt gọi món vừa gửi sẽ **lập tức nảy lên (Realtime)** trên màn hình KDS kèm chuông báo.
   - Bếp bấm "Bắt đầu làm" -> "Hoàn thành" từng món (POS sẽ nhận được Toast thông báo `ITEM_READY`).
3. **Thu ngân thanh toán tại quầy (POS):** `http://localhost:5175`
   - Đăng nhập. Chuyển sang Tab "Sơ đồ bàn", Bàn 5 đổi sang màu cam (Đang phục vụ).
   - Nhấp vào Bàn 5: Hiển thị đầy đủ danh sách món gộp từ các đợt gọi.
   - Nhập chiết khấu (nếu có) -> Bấm "Thanh toán bàn này".
   - Chọn Tiền mặt (nhập tiền khách đưa / chọn mệnh giá nhanh) hoặc Chuyển khoản VietQR PayOS -> Bấm "Xác nhận".
   - Hóa đơn nhiệt (80mm) hiển thị trọn vẹn toàn bộ món của tất cả đợt gọi để in.
   - **Realtime Sync:** Bàn 5 trên POS chuyển về màu xanh (Trống); điện thoại khách hàng tự động đóng modal và giải phóng bàn ăn.
   - Chuyển sang Tab "Quản lý Kho", số lượng nguyên liệu tự động bị trừ ngầm qua hệ thống RabbitMQ (Transactional SAGA).

### 🔑 Tài khoản Mẫu (Super Admin)
- **Tên đăng nhập:** `admin`
- **Mật khẩu:** `admin123`
*(Dùng để đăng nhập vào POS và KDS)*

---

## ⚙️ Hướng dẫn cho Developer
Hệ thống sử dụng cơ chế Multi-stage build cho Docker. 
Trong tương lai, khi hoàn thiện code cho các module đang dở dang (`product-service`, `branch-service`, `reporting-service`), các bạn thao tác như sau:
1. Mở file `docker-compose.yml`.
2. Tìm đến tên service đó và **xóa dấu comment `#`** phía trước các dòng cấu hình của khối đó.
3. Chạy lại lệnh `docker compose up --build -d`. Docker sẽ tự động nhận diện thay đổi và build image mới.

---

## 📚 Tài liệu Kỹ thuật
Vui lòng tham khảo thư mục `docs/` để biết thêm chi tiết về kiến trúc:
- [Kiến trúc Hệ thống (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md)
- [Tài liệu API (docs/API_DOCUMENTATION.md)](docs/API_DOCUMENTATION.md)
- [Luồng Hoạt động E2E (docs/E2E_WORKFLOWS.md)](docs/E2E_WORKFLOWS.md)
- [Yêu cầu Dự án & Traceability Matrix (docs/PROJECT_REQUIREMENTS.md)](docs/PROJECT_REQUIREMENTS.md)
- [Biểu đồ Lớp Thực thể (docs/CLASS_DIAGRAMS.md)](docs/CLASS_DIAGRAMS.md)
