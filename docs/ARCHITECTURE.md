# Kiến trúc Hệ thống (Architecture)

Hệ thống được thiết kế theo tư tưởng **Microservices**, đảm bảo tính mở rộng cao, khả năng chịu lỗi (fault-tolerance), và khả năng tách biệt miền dữ liệu (domain-driven design).

## 1. Kiến trúc Database-per-Service
Trong hệ thống F&B N70, mỗi Microservice hoàn toàn sở hữu và làm chủ một cơ sở dữ liệu riêng biệt.
- Các Service KHÔNG được phép truy xuất trực tiếp vào DB của nhau.
- **Lợi ích**: Giảm thiểu độ trễ truy xuất cục bộ, đảm bảo tính độc lập khi triển khai, dễ dàng nâng cấp hoặc thay đổi công nghệ cơ sở dữ liệu của một Service mà không ảnh hưởng tới toàn hệ thống.
- **Cụ thể**: 
  - `auth_db` (Quản lý User, Credential, Role).
  - `order_db` (Quản lý Order, OrderItems, Payment).
  - `inventory_db` (Quản lý Recipe, Ingredient, Stock).

## 2. Giao tiếp Đồng bộ (Synchronous Communication)
- **API Gateway tới Microservices**: Sử dụng **TCP Microservices** thông qua NestJS `ClientProxy`. Pattern được sử dụng là **Request-Response** (`MessagePattern`).
- Lợi ích: API Gateway chỉ đóng vai trò là cửa ngõ định tuyến, gọi RPC tới các Service tương ứng, chờ kết quả rồi trả về cho Frontend. Nó làm giảm sự phụ thuộc HTTP chồng chéo giữa các nội bộ.

### Realtime qua WebSocket (Socket.IO)
- `order-service` triển khai `EventsGateway` ở Port `3004`.
- Frontend (KDS, POS) kết nối trực tiếp với Port này, tham gia vào Room theo `branchId`.
- Sử dụng mô hình **Pub/Sub Room-based**: Bất cứ khi nào Order Service ghi nhận có thay đổi (Tạo đơn, Đổi trạng thái món), nó sẽ broadcast sự kiện tới toàn bộ Client trong room đó ngay lập tức (độ trễ < 50ms).

## 3. Giao tiếp Bất đồng bộ (Asynchronous Communication)
Được triển khai qua **RabbitMQ** bằng pattern **Event-Driven** (`EventPattern`).
- **Use case chính**: Xử lý logic nghiệp vụ tốn thời gian hoặc chạy nền, đảm bảo tính Consistency mà không làm nghẽn luồng Request-Response.
- **Ví dụ**: Khi thanh toán đơn hàng thành công, `order-service` sẽ Publish (phát) một event `order.completed`. Ngay lập tức API trả về kết quả thành công cho người dùng. Phía sau, `inventory-service` đóng vai trò là Consumer, lắng nghe event này, bóc tách dữ liệu và từ từ thực hiện thuật toán đệ quy trừ kho theo công thức (Recipe) tương ứng.

## 4. Cơ chế Bảo mật Stateless JWT & RBAC
- **Authentication**: JWT được sinh ra tại `auth-service` và trả về qua API Gateway sau khi Login. JWT được thiết kế theo chuẩn **Stateless**, chứa sẵn Payload về thông tin định danh và Danh sách quyền (Roles).
- **Authorization (RBAC)**: Tại API Gateway, hệ thống áp dụng `JwtAuthGuard` để bảo vệ Global (bảo vệ tất cả các route mặc định). Các Route công khai như Đăng nhập, Tạo đơn qua QR sẽ được dán mác `@Public()`.
- Việc giải mã (decode) và xác thực chữ ký JWT được thực hiện **trực tiếp tại API Gateway** (Zero-latency) nhờ chia sẻ chung `JWT_SECRET`, thay vì phải gửi request qua `auth-service` mỗi lần xác thực, giúp loại bỏ nút thắt cổ chai hiệu năng.
- Các Route được bảo vệ chi tiết bằng `@Roles('ADMIN', 'MANAGER')`, nếu Role trong Payload của JWT không khớp, API Gateway tự động từ chối (403 Forbidden) ngay vòng gửi xe.
