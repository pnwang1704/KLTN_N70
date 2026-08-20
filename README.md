# Hệ thống Quản lý F&B Đa Chi nhánh (Microservices)

Đây là mã nguồn hệ thống phần mềm quản lý chuỗi nhà hàng, quán cafe F&B được xây dựng theo kiến trúc **Microservices** hiện đại, kết nối thời gian thực (Realtime). Dự án phục vụ cho Đồ án/Khóa luận Tốt nghiệp (KLTN).

## 1. Bảng Tổng hợp Hạ tầng Hệ thống

| Thành phần | Công nghệ | Cổng (Port) | Cơ sở dữ liệu (DB) / Queue |
| :--- | :--- | :--- | :--- |
| **API Gateway** | NestJS | `3000` | N/A |
| **Auth Service** | NestJS, TypeORM | - | PostgreSQL (`5432`, `auth_db`), RabbitMQ (`auth_queue`) |
| **Order Service** | NestJS, Socket.IO | `3004` (HTTP/WS) | PostgreSQL (`5435`, `order_db`), RabbitMQ (`order_queue`) |
| **Inventory Service** | NestJS, TypeORM | - | PostgreSQL (`5436`, `inventory_db`), RMQ (`inventory_queue`) |
| **Message Broker** | RabbitMQ | `15672` (UI) / `5672` | Tài khoản Management UI: `guest` / `guest` |
| **Frontend KDS** | React, Vite | `5173` | Giao diện Bếp (Kitchen Display System) |
| **Frontend Customer**| React, Vite | `5174` | Web gọi món qua mã QR tại bàn |
| **Frontend POS** | React, Vite | `5175` | Web Thu ngân (Point of Sale) |

*Tài khoản Đăng nhập Hệ thống mặc định (Super Admin):*
- **Tên đăng nhập:** `admin`
- **Mật khẩu:** `admin123`

---

## 2. Hướng dẫn Khởi chạy Hệ thống từ đầu

### Bước 2.1: Khởi động Hạ tầng Docker (Database & RabbitMQ)
Chạy lệnh sau tại thư mục gốc của dự án để khởi động toàn bộ PostgreSQL và RabbitMQ:
```bash
docker-compose up -d
```
*(Nếu là lần đầu chạy, Auth Service sẽ tự động nạp sẵn tài khoản `admin` vào Database).*

### Bước 2.2: Khởi động các Microservices (Backend)
Mở nhiều tab Terminal, truy cập vào từng thư mục và chạy lệnh khởi động tương ứng:
```bash
# Terminal 1: API Gateway
cd api-gateway && npm run start:dev

# Terminal 2: Auth Service
cd services/auth-service && npm run start:dev

# Terminal 3: Inventory Service
cd services/inventory-service && npm run start:dev

# Terminal 4: Order Service
cd services/order-service && npm run start:dev
```

### Bước 2.3: Khởi động các Ứng dụng Frontend
Tương tự, mở thêm các tab Terminal mới:
```bash
# Terminal 5: Màn hình Bếp (KDS)
cd frontend/kds-web && npm run dev

# Terminal 6: Màn hình Khách tự gọi món (QR Customer)
cd frontend/customer-web && npm run dev

# Terminal 7: Màn hình Thu ngân (POS)
cd frontend/pos-web && npm run dev
```

---

## 3. Hướng dẫn Demo Nhanh Luồng E2E 3 Màn Hình

1. **Chuẩn bị màn hình:** 
   - Truy cập **POS** (`http://localhost:5175`), lấy JWT Token từ API Login và dán vào nút Cài đặt (Bánh răng góc phải).
   - Truy cập **KDS** (`http://localhost:5173`), dán JWT Token tương tự vào phần Cài đặt của bếp. Đảm bảo đèn báo Socket.IO màu xanh (Connected).
   - Truy cập **Customer Web** (`http://localhost:5174`). Giả lập kích thước màn hình Mobile.

2. **Kịch bản Demo Tương tác:**
   - Tại màn hình **Customer Web**, khách hàng tick chọn mua 2 ly Trà Sữa (thêm Trân châu, Size L) và bấm **Gọi Món**.
   - Ngay lập tức, tại màn hình **KDS**, đơn hàng vừa đặt sẽ "nảy" lên màn hình bếp với tiếng chuông cảnh báo. Trạng thái món là "Pending".
   - Nhân viên bếp (KDS) bấm nút **"Bắt đầu làm"**. Món ăn chuyển sang tab "Đang làm".
   - Sau khi pha chế xong, bếp bấm **"Hoàn thành"**. Ngay tích tắc, màn hình **POS** của Thu ngân sẽ hiển thị một thông báo màu xanh (Toast): *"Món Trà Sữa - Bàn 12 đã sẵn sàng!"*.
   - Thu ngân mang nước ra cho khách. Khách đến quầy thanh toán, Thu ngân nhấp vào nút **Thanh toán**, nhập số tiền khách đưa để hoàn tất đơn hàng. 

---

## 4. Tài liệu Kỹ thuật Chi tiết
Vui lòng xem các tài liệu chuyên sâu trong thư mục `docs/`:
- [Kiến trúc Hệ thống & Bảo mật (ARCHITECTURE.md)](./docs/ARCHITECTURE.md)
- [Chi tiết Luồng Nghiệp Vụ E2E (E2E_WORKFLOWS.md)](./docs/E2E_WORKFLOWS.md)
- [Tài liệu API Endpoint (API_DOCUMENTATION.md)](./docs/API_DOCUMENTATION.md)
