# Tài liệu API (API Documentation)

Toàn bộ REST API được hứng tại **API Gateway (Port 3000)** và định tuyến xuống các Microservices bên dưới qua Message Broker **RabbitMQ**.

---

## 1. REST APIs (Dành cho Frontend: POS Web, KDS Web, Customer Web)

| Method | Endpoint | Microservice đích | Roles / Auth | Mô tả & HTTP Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | `auth-service` | `@Public` | Xác thực đăng nhập bằng username & password. Trả về JWT Token và thông tin user (`200 OK`, `401 Unauthorized`). |
| `POST` | `/auth/users` | `auth-service` | `ADMIN`, `MANAGER` | Tạo tài khoản nhân viên mới (`username`, `password`, `fullName`, `role`: `ADMIN` \| `MANAGER` \| `CASHIER` \| `KITCHEN` \| `WAITER`, `branchId`) (`201 Created`, `400 Bad Request`, `403 Forbidden`). |
| `GET`  | `/auth/users` | `auth-service` | `ADMIN`, `MANAGER` | Lấy danh sách nhân viên (Hỗ trợ query `?branchId=`). Trả về danh sách user không chứa mật khẩu (`200 OK`). |
| `PATCH`| `/auth/users/:id/status` | `auth-service` | `ADMIN`, `MANAGER` | Bật/Tắt trạng thái kích hoạt tài khoản (`isActive`: `true`/`false`) (`200 OK`, `404 Not Found`). |
| `GET`  | `/orders` | `order-service` | `ADMIN`, `MANAGER`, `CASHIER` | Lấy danh sách lịch sử đơn hàng (Hỗ trợ lọc theo `?branchId=&fromDate=&toDate=`) (`200 OK`). |
| `GET`  | `/orders/shift-summary` | `order-service` | `ADMIN`, `MANAGER`, `CASHIER` | Báo cáo doanh thu, chi phí và đối soát két tiền mặt kết ca của Thu ngân (`?branchId=&cashierId=&fromDate=&toDate=`) (`200 OK`). |
| `POST` | `/orders/expenses` | `order-service` | `ADMIN`, `MANAGER`, `CASHIER` | Tạo phiếu chi tiền mặt (Cash Out) từ két tiền thu ngân (`201 Created`, `400 Bad Request`). |
| `GET`  | `/orders/expenses` | `order-service` | `ADMIN`, `MANAGER`, `CASHIER` | Lấy danh sách phiếu chi tiền mặt trong ca/chi nhánh (`?branchId=&cashierId=&fromDate=&toDate=`) (`200 OK`). |
| `GET`  | `/orders/active` | `order-service` | `@Public` | Lấy danh sách đơn hàng đang mở / chưa thanh toán của chi nhánh hoặc theo bàn (`?branchId=&tableId=`) (`200 OK`). |
| `POST` | `/orders` | `order-service` | `@Public` | Tạo đơn hàng mới từ Customer Web (Dine-in Post-pay) hoặc POS Web (`201 Created`, `400 Bad Request`). |
| `DELETE`| `/orders/:id` | `order-service` | `ADMIN`, `MANAGER`, `CASHIER` | Hủy đơn hàng tạm khi đóng modal thanh toán mà chưa thanh toán. **Điều kiện chặn:** Chỉ xóa khi `status === PENDING`, chặn xóa đơn đã `COMPLETED` (`200 OK`, `400 Bad Request`, `404 Not Found`). |
| `POST` | `/orders/:id/pay` | `order-service` | `ADMIN`, `CASHIER` | Hoàn tất thanh toán cho một đơn hàng cụ thể (Tiền mặt hoặc Chuyển khoản QR), ghi nhận `Payment`, đổi trạng thái sang `COMPLETED` và kích hoạt trừ kho qua RabbitMQ (`200 OK`, `400 Bad Request`, `404 Not Found`). |
| `POST` | `/orders/pay-table` | `order-service` | `ADMIN`, `CASHIER` | Hoàn tất thanh toán toàn bộ đơn của một bàn: hợp nhất các đợt gọi thành 1 đơn `COMPLETED`, lưu `Payment`, dọn dẹp đơn phụ và phát Socket.IO `table:completed` (`200 OK`, `400 Bad Request`, `404 Not Found`). |
| `PATCH`| `/orders/item-status` | `order-service` | `KITCHEN`, `ADMIN` | Cập nhật trạng thái từng món ăn trên màn hình KDS (`PENDING` -> `IN_PROGRESS` -> `COMPLETED`) (`200 OK`). |
| `GET`  | `/inventory` | `inventory-service` | `ADMIN`, `MANAGER` | Lấy danh sách tồn kho nguyên liệu theo chi nhánh (`200 OK`). |
| `POST` | `/inventory/stock-in` | `inventory-service` | `ADMIN`, `MANAGER` | Nhập nguyên vật liệu vào kho chi nhánh (`201 Created`). |
| `POST` | `/payments/payos/create` | `api-gateway` | `@Public` | Tạo link thanh toán VietQR động tích hợp PayOS (tự động gắn `orderCode` và số tiền chính xác sau chiết khấu) (`200 OK`). |
| `POST` | `/payments/payos/status` | `api-gateway` | `@Public` | Polling kiểm tra trạng thái thanh toán từ PayOS qua `orderCode` (`200 OK`). |
| `POST` | `/webhooks/payos` | `api-gateway` | `@Public` | Endpoint nhận Webhook tự động từ PayOS khi khách hàng chuyển khoản thành công (`200 OK`). |

---

### 1.1. DTO Mẫu: Tạo đơn hàng (`POST /orders`)
```json
{
  "branchId": "1",
  "orderType": "AT_TABLE",
  "tableId": "5",
  "totalAmount": 90000,
  "finalAmount": 81000,
  "discountPercent": 10,
  "items": [
    {
      "productId": "p101",
      "productName": "Trà Sữa Trân Châu Đường Đen",
      "size": "L",
      "quantity": 2,
      "unitPrice": 35000,
      "note": "Ít ngọt, nhiều đá",
      "toppings": [
        {
          "toppingId": "top01",
          "toppingName": "Trân châu hoàng kim",
          "price": 10000,
          "quantity": 2
        }
      ]
    }
  ]
}
```

### 1.2. DTO Mẫu: Hoàn tất thanh toán bàn (`POST /orders/pay-table`)
```json
{
  "branchId": "1",
  "tableId": "5",
  "paymentMethod": "CASH",
  "amountPaid": 100000
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "completedOrderIds": [
    "c8b4f179-631d-408a-bfe0-55e143b44b82"
  ]
}
```

### 1.3. Response Mẫu: Hủy đơn hàng PENDING (`DELETE /orders/:id`)
* **Endpoint:** `DELETE /orders/:id`
* **Quyền thực thi (Roles):** `ADMIN`, `MANAGER`, `CASHIER`
* **Mục đích:** Xóa sạch bản ghi đơn hàng tạm (dọn dẹp database khi khách đóng modal thanh toán trước khi xác nhận tiền).
* **Ràng buộc nghiệp vụ:**
  - Nếu đơn hàng có trạng thái khác `PENDING` (ví dụ: `COMPLETED`): Trả về `400 Bad Request` với thông báo `"Chỉ được phép xóa đơn hàng đang ở trạng thái PENDING"`.
  - Nếu không tìm thấy mã đơn: Trả về `404 Not Found` với thông báo `"Order not found"`.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Đã xóa đơn hàng thành công"
}
```

### 1.4. Query Báo cáo kết ca / Doanh thu trong ca của Thu ngân (`GET /orders/shift-summary`)
* **Endpoint:** `GET /orders/shift-summary`
* **Quyền thực thi (Roles):** `ADMIN`, `MANAGER`, `CASHIER`
* **Query Parameters:**
  - `branchId` (bắt buộc): ID chi nhánh (ví dụ: `1`).
  - `cashierId` (tùy chọn): ID thu ngân (nếu không truyền, tự động trích xuất từ JWT token `req.user.sub`).
  - `fromDate` (tùy chọn): Thời điểm bắt đầu ca (ISO 8601 string, ví dụ: `2026-09-14T06:00:00.000Z`).
  - `toDate` (tùy chọn): Thời điểm kết ca / thời điểm truy vấn (ISO 8601 string).
* **Mục đích:** Cung cấp số liệu tài chính vận hành tức thời cho Thu ngân đối soát quỹ tiền mặt và doanh thu ca trực, hỗ trợ in Phiếu kết ca nhiệt 80mm trước khi bàn giao.
* **Quy chuẩn Kế toán Đối soát:**
  - **Tổng doanh thu ca:** $\text{totalRevenue} = \text{totalCash} + \text{totalBankTransfer}$ (Doanh số bán hàng thực tế, không bị trừ chi phí).
  - **Chốt tiền mặt trong két:** $\text{closingCash} = \text{initialCash} + \text{totalCash} - \text{totalExpense}$ (Kiểm kê tiền mặt bàn giao thực tế tại quầy).

**Response (200 OK):**
```json
{
  "totalRevenue": 1250000,
  "totalCash": 750000,
  "totalBankTransfer": 500000,
  "totalExpense": 50000,
  "totalOrders": 15,
  "expenses": [
    {
      "id": "061da6b9-8d85-4ced-8390-33cfc495057a",
      "branchId": "1",
      "cashierId": "380a9f0f-a691-4718-bcdb-99ea94d07d38",
      "amount": 50000,
      "reason": "Mua đá cây khẩn cấp",
      "note": "Tiệm tạp hóa số 5",
      "createdAt": "2026-09-19T06:56:50.979Z"
    }
  ],
  "recentOrders": [
    {
      "id": "e93bc4da-...",
      "orderCode": 10024,
      "orderType": "AT_TABLE",
      "finalAmount": 85000,
      "createdAt": "2026-09-14T07:15:00.000Z",
      "payment": {
        "paymentMethod": "CASH",
        "amount": 100000
      }
    }
  ]
}
```

### 1.5. Tạo phiếu chi tiền mặt tại két (`POST /orders/expenses`)
* **Endpoint:** `POST /orders/expenses`
* **Quyền thực thi (Roles):** `ADMIN`, `MANAGER`, `CASHIER`
* **Xác thực:** Gửi kèm Header `Authorization: Bearer <accessToken>`. Gateway tự động giải mã `req.user.sub` để gán `cashierId`, trích xuất `branchId` từ user profile hoặc payload.
* **Mục đích:** Ghi nhận các khoản chi tiền mặt trực tiếp từ két tại quầy (mua đá cây, nguyên vật liệu khẩn cấp, đồ dùng vận hành) và hỗ trợ in Phiếu chi nhiệt 80mm.

**Request Body (JSON):**
```json
{
  "amount": 50000,
  "reason": "Mua thêm đá bi và chanh tươi",
  "note": "Tiệm tạp hóa cô Ba"
}
```

**Ràng buộc DTO (`CreateExpenseDto`):**
- `amount`: Số nguyên hoặc số thực dương (`IsNumber`, `Min(1)`).
- `reason`: Chuỗi mô tả lý do chi, bắt buộc (`IsString`, `IsNotEmpty`).
- `note`: Chuỗi ghi chú hoặc người nhận tiền, không bắt buộc (`IsString`, `IsOptional`).

**Response (201 Created):**
```json
{
  "id": "061da6b9-8d85-4ced-8390-33cfc495057a",
  "branchId": "1",
  "cashierId": "380a9f0f-a691-4718-bcdb-99ea94d07d38",
  "amount": 50000,
  "reason": "Mua thêm đá bi và chanh tươi",
  "note": "Tiệm tạp hóa cô Ba",
  "createdAt": "2026-09-19T06:56:50.979Z"
}
```

### 1.6. Lấy danh sách phiếu chi tiền mặt (`GET /orders/expenses`)
* **Endpoint:** `GET /orders/expenses`
* **Quyền thực thi (Roles):** `ADMIN`, `MANAGER`, `CASHIER`
* **Query Parameters:**
  - `branchId` (bắt buộc): ID chi nhánh (ví dụ: `1`).
  - `cashierId` (tùy chọn): ID thu ngân lập phiếu.
  - `fromDate` (tùy chọn): Thời điểm bắt đầu lọc (ISO 8601 string).
  - `toDate` (tùy chọn): Thời điểm kết thúc lọc (ISO 8601 string).

**Response (200 OK):**
```json
[
  {
    "id": "061da6b9-8d85-4ced-8390-33cfc495057a",
    "branchId": "1",
    "cashierId": "380a9f0f-a691-4718-bcdb-99ea94d07d38",
    "amount": 50000,
    "reason": "Mua thêm đá bi và chanh tươi",
    "note": "Tiệm tạp hóa cô Ba",
    "createdAt": "2026-09-19T06:56:50.979Z"
  }
]
```

---

## 2. Message Pattern RPC (Giao tiếp đồng bộ Request-Response qua RabbitMQ)

API Gateway sử dụng `ClientProxy.send()` (NestJS Microservices RPC) để gửi yêu cầu và đợi kết quả phản hồi từ các Microservices.

| Pattern (CMD / Topic) | Service gửi | Service xử lý | Dữ liệu đầu vào (Payload) | Dữ liệu trả về (Response) |
| :--- | :--- | :--- | :--- | :--- |
| `{ cmd: 'login' }` | API Gateway | `auth-service` | `{ username, password }` | `{ accessToken, user }` |
| `{ cmd: 'create_user' }` | API Gateway | `auth-service` | `CreateUserDto` (Băm mật khẩu Bcrypt) | `User` (Đã loại bỏ password) |
| `{ cmd: 'get_users' }` | API Gateway | `auth-service` | `{ branchId?: string }` | `User[]` |
| `{ cmd: 'toggle_user_status' }` | API Gateway | `auth-service` | `{ id: string }` | `User` (Trạng thái `isActive` đã lật) |
| `{ cmd: 'validate_token' }` | API Gateway | `auth-service` | `{ token: string }` | `{ valid: boolean, user: JwtPayload }` |
| `'create_order'` | API Gateway | `order-service` | `CreateOrderDto` | `Order` mới tạo (`status: PENDING`) |
| `'get_orders'` | API Gateway | `order-service` | `branchId: string` \| `{ branchId, fromDate?, toDate? }` | `Order[]` (kèm items & toppings) |
| `'get_active_orders'` | API Gateway | `order-service` | `{ branchId: string, tableId?: string }` | `Order[]` (các đơn chưa hoàn tất của bàn/chi nhánh) |
| `'get_shift_summary'` | API Gateway | `order-service` | `{ branchId, cashierId?, fromDate?, toDate? }` | `ShiftSummaryResult` (`totalRevenue`, `totalCash`, `totalBankTransfer`, `totalExpense`, `expenses`, `totalOrders`, `recentOrders`) |
| `'create_expense'` | API Gateway | `order-service` | `CreateExpenseDto & { branchId, cashierId }` | `Expense` entity mới tạo trong cơ sở dữ liệu |
| `'get_expenses'` | API Gateway | `order-service` | `{ branchId, cashierId?, fromDate?, toDate? }` | `Expense[]` danh sách các phiếu chi tiền mặt |
| `'process_payment'` | API Gateway | `order-service` | `{ orderId, processPaymentDto }` | `Order` (`status: COMPLETED`, `payment`) |
| `'pay_table_orders'` | API Gateway | `order-service` | `{ branchId, tableId, paymentMethod, amountPaid }` | `{ success: boolean, completedOrderIds: string[] }` |
| `'delete_order'` | API Gateway | `order-service` | `id: string` | `{ success: boolean, message: string }` |
| `'update_item_status'` | API Gateway | `order-service` | `UpdateItemStatusDto` | `OrderItem` |
| `'process_payos_webhook'` | API Gateway | `order-service` | `{ orderCode, amount }` | `Order` |
| `{ cmd: 'get_inventory' }` | API Gateway | `inventory-service`| `{ branchId?: string }` | `BranchStock[]` |
| `{ cmd: 'stock_in' }` | API Gateway | `inventory-service`| `StockInDto` | `StockTransaction` |

---

## 3. Event Pattern (Giao tiếp bất đồng bộ qua RabbitMQ Pub/Sub)

Các Microservices sử dụng `ClientProxy.emit()` để phát thanh sự kiện theo cơ chế Fire-and-forget. Microservice nhận sẽ xử lý background ngầm đảm bảo tính toàn vẹn dữ liệu (SAGA Pattern).

| Event Name | Service phát | Service nhận | Payload | Hành vi nghiệp vụ (Background Handling) |
| :--- | :--- | :--- | :--- | :--- |
| `order_completed` | `order-service` | `inventory-service` | `{ orderId, branchId, items: [...] }` | Tìm công thức chế biến (`Recipe`) cho từng món và size; mở TypeORM Database Transaction trừ kho tương ứng; nếu thiếu kho sẽ kích hoạt Transaction Rollback và ghi log cảnh báo. |

---

## 4. Socket.IO Events (Realtime Gateway tại Port 3004)

WebSocket Server chạy trên `order-service` (Port `3004`) phụ trách đẩy dữ liệu tức thì cho **POS Web**, **KDS Web** và **Customer Web**.

| Event Name | Chiều truyền | Room / Scope | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `joinBranchRoom` | Client -> Server | Toàn bộ Clients | Client gửi chuỗi `branchId`. Server đưa Socket Client vào room tương ứng nhằm cô lập dữ liệu theo từng chi nhánh (Multi-branch Isolation). |
| `NEW_ORDER_CREATED` | Server -> KDS Web | `branch_${branchId}` | Phát khi có đơn hàng mới tạo (`PENDING`). KDS tự động thêm thẻ đơn vào danh sách chế biến kèm chuông báo và đồng hồ đếm ngược. |
| `ITEM_READY` | Server -> POS Web | `branch_${branchId}` | Phát khi Đầu bếp bấm "Hoàn thành" một món trên KDS. POS Web hiển thị Toast thông báo nổi và lưu vào danh sách thông báo (Notification Dropdown). |
| `order:paid` | Server -> POS Web | `branch_${branchId}` | Phát khi đơn hàng nhận được thanh toán thành công từ Webhook PayOS hoặc quẹt thẻ. POS Web lập tức đóng modal thanh toán và kích hoạt in hóa đơn. |
| `table:completed` | Server -> Customer & POS Web | `branch_${branchId}` | Phát khi thu ngân hoàn tất thanh toán cho bàn. Payload: `{ branchId, tableId, orderId, orderIds }`. Customer Web tự động đóng modal tra cứu món và reset bàn; POS Web chuyển trạng thái bàn sang Bàn trống. |
