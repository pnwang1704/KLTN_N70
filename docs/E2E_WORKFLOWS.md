# Đặc tả Luồng Nghiệp Vụ Chuyên Sâu (End-to-End Workflows)

Dưới đây là sơ đồ luồng dữ liệu tuần tự mô phỏng một vòng đời hoàn chỉnh của nghiệp vụ cốt lõi: Bán hàng -> Điều phối bếp -> Thanh toán -> Trừ tồn kho nguyên liệu.

## Luồng Giao Dịch Chuyên Sâu (Order to Inventory)

### Bước 1: Khởi tạo Đơn hàng (Create Order)
- **Actor:** Khách hàng (quét QR) hoặc Thu ngân (POS).
- **Hành động:** Chọn món, điều chỉnh size/topping, điền ghi chú. Bấm "Tạo đơn".
- **Hệ thống xử lý:**
  1. Frontend gửi HTTP POST tới `API Gateway (/orders)`.
  2. API Gateway nhận diện đây là route `@Public()` -> Bỏ qua check JWT -> Forward (TCP) tới `order-service`.
  3. `order-service` tính toán giá trị `totalAmount`, `finalAmount`.
  4. Lưu cấu trúc Đơn hàng và Snapshot từng Món ăn (bao gồm giá cả, tên topping tại thời điểm bán) vào PostgreSQL (`order_db`). Đảm bảo dữ liệu hóa đơn không bị ảnh hưởng nếu sau này Product thay đổi giá.
  5. Đổi trạng thái toàn bộ món ăn thành `PENDING`.

### Bước 2: Báo Đơn Thời Gian Thực (KDS Realtime Notification)
- **Hệ thống xử lý:**
  1. Sau khi `order_db` commit thành công, `order-service` kích hoạt `EventsGateway`.
  2. Phương thức `emitNewOrder(branchId, orderData)` được gọi.
  3. Qua Socket.IO, một sự kiện `NEW_ORDER_CREATED` được Broadcast tới toàn bộ các Client đang join chung `room: branchId`.
- **Actor:** Màn hình KDS của bếp ngay lập tức nhận sự kiện, re-render giao diện, đổ tiếng chuông cảnh báo và chèn thẻ món ăn mới vào cột "Đang chờ".

### Bước 3: Điều Phối Pha Chế & Báo Món Sẵn Sàng (Item Ready)
- **Actor:** Nhân viên pha chế tại bếp.
- **Hành động:** Bấm "Bắt đầu làm" -> Trạng thái món thành `IN_PROGRESS`. Sau đó pha xong, bấm "Hoàn thành" -> Trạng thái món thành `COMPLETED`.
- **Hệ thống xử lý:**
  1. Frontend KDS gọi `PATCH /orders/item-status`.
  2. `order-service` cập nhật trạng thái trong `order_db`.
  3. Nếu trạng thái là `COMPLETED`, hệ thống tiếp tục gọi `EventsGateway.emitItemReady()`.
  4. Sự kiện `ITEM_READY` bay tới Frontend POS của Thu ngân. POS hiển thị Toast notification xanh lá nhắc nhở bưng đồ.

### Bước 4: Thanh toán & Chốt Hóa Đơn (Payment - UC02)
- **Actor:** Thu ngân tại quầy POS.
- **Hành động:** Khách hàng ra quầy, đưa tiền. Thu ngân bấm "Thanh toán", nhập số tiền.
- **Hệ thống xử lý:**
  1. POS gọi `POST /orders/:id/pay` mang theo JWT Token của thu ngân.
  2. API Gateway verify JWT (hợp lệ) -> Kiểm tra Role (CASHIER/MANAGER hợp lệ) -> Forward tới `order-service`.
  3. `order-service` ghi nhận `Payment` vào cơ sở dữ liệu.
  4. Nếu thanh toán đủ tiền, `order-service` đổi trạng thái Order thành `COMPLETED`.
  5. **QUAN TRỌNG:** Ngay lúc này, `order-service` dùng RabbitMQ Client để emit một Event: `@EventPattern('order.completed')`, kèm theo toàn bộ Snapshot của các món đã bán.

### Bước 5: Tiêu Hao Tồn Kho Bất Đồng Bộ (Inventory Deduction)
- **Hệ thống xử lý:**
  1. Event `order.completed` đang nằm trong RabbitMQ Exchange.
  2. `inventory-service` đóng vai trò Consumer, lắng nghe và bóc tách gói Event này.
  3. Với mỗi Món ăn bán ra (Ví dụ: Trà sữa Trân châu), Service sẽ tra cứu DB bảng `Recipe` (Công thức).
  4. Lấy ra định mức (Ví dụ: Cần 50gr Trà đen, 20ml Sữa đặc, 30gr Trân châu).
  5. Thực hiện phép toán trừ trực tiếp vào Bảng `Stock` (Tồn kho) theo logic Transaction: Nếu Inventory giảm qua ngưỡng an toàn, sinh log cảnh báo.
  6. Mọi thao tác trừ kho này chạy ngầm (Background), hoàn toàn không làm chậm trễ quá trình in hóa đơn hay trả response cho Thu ngân ở Bước 4.

Đây chính là chuẩn mực của kiến trúc Event-Driven Microservices.
