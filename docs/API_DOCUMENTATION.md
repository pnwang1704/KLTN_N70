# Tài liệu API (API Documentation)

Toàn bộ REST API được hứng tại **API Gateway (Port 3000)** và route xuống các Microservices bên dưới qua RabbitMQ.

## 1. REST APIs (Dành cho Frontend)

| Method | Endpoint | Microservice | Roles / Auth | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | `auth-service` | `@Public` | Xác thực người dùng, trả về JWT Token. |
| `GET`  | `/orders` | `order-service` | `ADMIN`, `MANAGER`, `CASHIER` | Lấy danh sách lịch sử đơn hàng (Lọc theo branchId). |
| `GET`  | `/orders/active` | `order-service` | `@Public` | Lấy danh sách đơn hàng đang chế biến / phục vụ. |
| `POST` | `/orders` | `order-service` | `@Public` | Tạo đơn hàng mới từ QR (hoặc POS). |
| `PATCH`| `/orders/:id/status` | `order-service` | `ADMIN`, `CASHIER`, `KITCHEN`| Cập nhật trạng thái tổng thể đơn (PENDING -> COMPLETED). |
| `PATCH`| `/orders/:id/items/:itemId`| `order-service` | `KITCHEN` | Cập nhật trạng thái từng món ăn (KDS). |
| `GET`  | `/inventory` | `inventory-service`| `ADMIN`, `MANAGER` | Lấy danh sách tồn kho nguyên liệu. |
| `POST` | `/inventory/stock-in`| `inventory-service`| `ADMIN`, `MANAGER` | Nhập hàng vào kho. |
| `POST` | `/payments/payos/create` | `api-gateway` | `@Public` | Tạo link thanh toán PayOS (VietQR động). |
| `POST` | `/payments/payos/status` | `api-gateway` | `@Public` | Polling kiểm tra trạng thái thanh toán từ PayOS. |
| `POST` | `/webhooks/payos` | `api-gateway` | `@Public` | Hứng Webhook từ PayOS báo thanh toán thành công. |

### Payload Mẫu (Tạo đơn hàng - POST `/orders`)
```json
{
  "branchId": 1,
  "orderType": "AT_TABLE",
  "tableId": "12",
  "items": [
    {
      "productId": "P1",
      "productName": "Trà Sữa Trân Châu KLTN",
      "quantity": 2,
      "unitPrice": 35000,
      "size": "M",
      "toppings": [
        { "toppingId": "T1", "toppingName": "Trân châu trắng", "quantity": 1, "price": 10000 }
      ]
    }
  ],
  "totalAmount": 90000
}
```

---

## 2. Message Pattern (Giao tiếp nội bộ qua RabbitMQ)

Gateway sử dụng `ClientProxy.send()` (Message Pattern) để yêu cầu Microservice xử lý và trả về kết quả (Req-Res).

| Pattern (CMD) | Gửi từ | Nhận tại | Mục đích |
| :--- | :--- | :--- | :--- |
| `{ cmd: 'login' }` | API Gateway | `auth-service` | Validate user & generate JWT. |
| `{ cmd: 'validate_token' }` | API Gateway | `auth-service` | Giái mã Token cho Global AuthGuard. |
| `{ cmd: 'create_order' }` | API Gateway | `order-service` | Lưu đơn hàng mới. |
| `{ cmd: 'get_orders' }` | API Gateway | `order-service` | Lấy danh sách đơn hàng. |
| `{ cmd: 'get_inventory' }` | API Gateway | `inventory-service`| Lấy danh sách tồn kho. |
| `{ cmd: 'stock_in' }` | API Gateway | `inventory-service`| Lưu thông tin nhập kho. |
| `'process_payos_webhook'`| API Gateway | `order-service` | Báo cáo Đơn hàng đã thanh toán thành công qua PayOS Webhook/Polling. |

---

## 3. Event Pattern (Bất đồng bộ qua RabbitMQ)

Sử dụng `ClientProxy.emit()` (Event Pattern) để phát thanh sự kiện, không cần đợi kết quả phản hồi (Fire-and-forget).

| Event Name | Gửi từ | Nhận tại | Mục đích / Xử lý ngầm |
| :--- | :--- | :--- | :--- |
| `order_completed` | `order-service` | `inventory-service`| Trừ nguyên liệu tương ứng trong kho sau khi thanh toán thành công (SAGA Pattern / Transaction Log). |

---

## 4. Socket.IO Events (Realtime)

Server WebSocket lắng nghe tại cổng `3004` (Order Service). Cung cấp cơ chế Realtime cho POS và KDS.

| Event Name | Phát từ (Emitter) | Nhận tại (Listener) | Mô tả |
| :--- | :--- | :--- | :--- |
| `joinBranchRoom` | Frontend (Client) | Order Service (Server) | Client gửi `branchId` để Server sắp xếp vào Room (Phòng) tương ứng. Đảm bảo dữ liệu chi nhánh nào chỉ hiển thị ở chi nhánh đó. |
| `newOrder` | Order Service | KDS Web | Phát ra khi có đơn hàng mới (Trạng thái PENDING). Bếp sẽ nhận được để hiển thị thẻ đơn nấu. |
| `order:paid` | Order Service | POS & Customer Web | Phát ra khi thanh toán PayOS thành công (nhận Webhook). POS tự động chuyển trạng thái in hóa đơn. |
| `ITEM_READY` | Order Service | POS Web | Phát ra khi Bếp bấm hoàn thành món (KDS). POS sẽ hiển thị Toast thông báo và lưu vào Chuông thông báo (Notification Dropdown). |
