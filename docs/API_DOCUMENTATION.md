# Tài liệu Kỹ thuật API (API Documentation)

Đây là danh sách các Endpoint đang mở thông qua **API Gateway (Port 3000)** để Frontend giao tiếp.

## 1. Auth & Accounts

### 1.1. Đăng nhập (Login)
- **Route:** `POST /auth/login`
- **Security:** `@Public()` (Không cần Token)
- **Body:**
```json
{
  "username": "admin",
  "password": "password"
}
```
- **Response (201 Created):**
```json
{
  "accessToken": "eyJhbGciOiJIUz...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "ADMIN",
    "branchId": "1"
  }
}
```

## 2. Orders & Sales (Bán hàng)

### 2.1. Tạo Đơn hàng Mới (Create Order)
- **Route:** `POST /orders`
- **Security:** `@Public()` (Hỗ trợ QR Order Web không cần Token)
- **Body:**
```json
{
  "branchId": "1",
  "tableId": "12",
  "orderType": "AT_TABLE",
  "totalAmount": 45000,
  "finalAmount": 45000,
  "items": [
    {
      "productId": "P1",
      "productName": "Trà Sữa",
      "size": "L",
      "quantity": 1,
      "unitPrice": 45000,
      "toppings": [
        { "toppingId": "T1", "toppingName": "Trân châu", "price": 10000, "quantity": 1 }
      ]
    }
  ]
}
```
- **Response (201 Created):** Object Đơn hàng kèm mảng Items đã lưu database.

### 2.2. Thanh toán Hóa Đơn (Process Payment)
- **Route:** `POST /orders/:id/pay`
- **Security:** `@Roles('ADMIN', 'MANAGER', 'CASHIER')` (Bắt buộc Header: `Authorization: Bearer <token>`)
- **Body:**
```json
{
  "paymentMethod": "CASH",
  "amountPaid": 50000
}
```

### 2.3. Đổi Trạng Thái Món KDS (Update Item Status)
- **Route:** `PATCH /orders/item-status`
- **Security:** `@Roles('ADMIN', 'MANAGER', 'KITCHEN')` (Bắt buộc Token của Bếp)
- **Body:**
```json
{
  "orderItemId": "uuid",
  "itemStatus": "IN_PROGRESS" // hoặc COMPLETED
}
```

---

## 3. Kiến trúc Message/Event Nội bộ (RabbitMQ)

Các pattern này **KHÔNG MỞ** ra cho Frontend HTTP. Chúng chỉ giao tiếp qua luồng Transport TCP/RabbitMQ nội bộ giữa Gateway và các Services.

### 3.1. Message Patterns (Request-Response Sync)
*Gateway gọi -> Đợi Service xử lý -> Trả Data về Gateway*
- `login`: Gọi tới Auth Service để sinh token.
- `create_order`: Gọi tới Order Service để ghi database.
- `update_item_status`: Gọi tới Order Service.
- `process_payment`: Gọi tới Order Service xử lý tiền.
- `create_ingredient`, `create_recipe`, `stock_in`: Gọi tới Inventory Service.

### 3.2. Event Patterns (Fire-and-Forget Async)
*Service phát sự kiện (Broadcast) -> RabbitMQ Queue -> Consumer Services tự bắt tự chạy nền.*
- **`order.completed`**: Emit bởi Order Service khi Payment thành công. Payload chứa danh sách món (Snapshot Items). Được listen bởi Inventory Service để chạy hàm đệ quy trừ kho tự động.
