# F&B Microservices System

Hệ thống quản lý chuỗi F&B dựa trên kiến trúc Microservices sử dụng NestJS, PostgreSQL, và RabbitMQ.

## Cấu trúc dự án
- `api-gateway`: API Gateway xử lý HTTP requests và định tuyến message.
- `services/auth-service`: Quản lý tài khoản, xác thực.
- `services/branch-service`: Quản lý chi nhánh, sơ đồ bàn.
- `services/product-service`: Quản lý thực đơn.
- `services/order-service`: Quản lý đơn hàng (POS, KDS).
- `services/inventory-service`: Quản lý kho, nguyên vật liệu.
- `services/reporting-service`: Quản lý báo cáo doanh thu, tiêu hao.

## Hướng dẫn chạy dự án

### 1. Khởi động Infrastructure
Hệ thống cần PostgreSQL (6 databases) và RabbitMQ. Chạy lệnh sau ở thư mục gốc để bật hạ tầng thông qua Docker Compose:

```bash
docker-compose up -d
```

Các dịch vụ sẽ chạy tại:
- **RabbitMQ Management UI**: http://localhost:15672 (user/password)
- **PostgreSQL**: Các service từ `5432` đến `5437`.

### 2. Cài đặt Dependencies
Mở Terminal, di chuyển vào từng thư mục dự án (`api-gateway` và các service trong `services/`) để cài đặt thư viện nếu chưa cài:
```bash
cd api-gateway && npm install
cd services/auth-service && npm install
# Tương tự cho các service còn lại...
```

### 3. Chạy các service
Bạn có thể chạy các service bằng lệnh:
```bash
npm run start:dev
```
Lưu ý: Bạn có thể cần thiết lập script chạy đồng thời hoặc sử dụng công cụ như `concurrently` / `pm2` để quản lý nhiều process cùng lúc nếu không dùng Docker cho mã nguồn NestJS.
