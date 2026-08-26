# Hệ thống POS & KDS Bán Hàng F&B (Khóa Luận Tốt Nghiệp)

Dự án Hệ thống Quản lý Bán hàng F&B (Food & Beverage) hiện đại, tích hợp KDS (Kitchen Display System), QR Order và POS (Point of Sale). Hệ thống được xây dựng theo kiến trúc Microservices với Node.js, React (Vite), PostgreSQL, RabbitMQ, và được đóng gói hoàn toàn bằng Docker.

## 🚀 Tính năng nổi bật
- **Customer QR Web:** Quét mã QR tại bàn để gọi món.
- **KDS Web:** Màn hình hiển thị bếp Realtime (đồng bộ Socket.io).
- **POS Web:** Màn hình thu ngân, quản lý sơ đồ bàn, kho hàng và in hóa đơn nhiệt.
- **Thanh toán Tự động PayOS:** Tích hợp sinh mã VietQR động, Webhook/Polling xác nhận tiền vào tài khoản tự động đóng đơn.
- **Microservices Architecture:** Tách biệt hoàn toàn Auth, Order, Inventory, v.v.

---

## 🏗 Bảng Tổng hợp Hạ tầng (Infrastructure & Ports)
Toàn bộ hệ thống chạy ngầm trong một mạng nội bộ (`app-network`). Dưới đây là danh sách các Port được mở ra môi trường Host (máy thật):

| Thành phần | Công nghệ | Container Name | Port ngoài (Host) | Port trong |
| :--- | :--- | :--- | :--- | :--- |
| **RabbitMQ Management** | RabbitMQ | `fnb_rabbitmq` | `15672` (UI), `5672` | 15672, 5672 |
| **API Gateway** | NestJS | `fnb_api_gateway` | **`3000`** | 3000 |
| **Order Service (Socket)** | NestJS | `fnb_order_service` | **`3004`** | 3004 |
| **Auth Database** | PostgreSQL | `fnb_postgres_auth` | `5432` | 5432 |
| **Product Database** | PostgreSQL | `fnb_postgres_product`| `5434` | 5432 |
| **Order Database** | PostgreSQL | `fnb_postgres_order` | `5435` | 5432 |
| **Inventory Database** | PostgreSQL| `fnb_postgres_inventory`| `5436` | 5432 |
| **Branch DB** *(Pending)* | PostgreSQL | `fnb_postgres_branch` | `5437` | 5432 |
| **Reporting DB** *(Pending)*| PostgreSQL | `fnb_postgres_reporting`| `5438` | 5432 |
| **KDS Web** | React + Nginx | `fnb_kds_web` | **`5173`** | 80 |
| **Customer QR Web** | React + Nginx | `fnb_customer_web` | **`5174`** | 80 |
| **POS Web** | React + Nginx | `fnb_pos_web` | **`5175`** | 80 |

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

1. **Khách hàng gọi món (Customer QR):** `http://localhost:5174`
   - Bấm chọn món, thêm Topping, Ghi chú. Bấm "Thanh toán".
2. **Nhà Bếp (KDS):** `http://localhost:5173`
   - Đăng nhập (nếu yêu cầu). Đơn hàng vừa tạo sẽ **lập tức nảy lên (Realtime)** ở màn hình bếp. Bếp bấm "Bắt đầu làm" -> "Hoàn thành".
3. **Thu ngân (POS):** `http://localhost:5175`
   - Đăng nhập. Chuyển sang Tab "Sơ đồ bàn", bàn của khách sẽ đổi màu (Đang phục vụ).
   - Nhấp vào bàn -> Bấm thanh toán.
   - Hóa đơn nhiệt (80mm) sẽ tự động hiện lên để in.
   - Chuyển sang Tab "Quản lý Kho", số lượng nguyên liệu tự động bị trừ ngầm qua hệ thống Message Broker.

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
- [Kiến trúc Hệ thống (ARCHITECTURE.md)](docs/ARCHITECTURE.md)
- [Tài liệu API (API_DOCUMENTATION.md)](docs/API_DOCUMENTATION.md)
- [Luồng Hoạt động E2E (E2E_WORKFLOWS.md)](docs/E2E_WORKFLOWS.md)
