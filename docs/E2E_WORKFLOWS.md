# Luồng Hoạt động E2E (End-to-End Workflows)

Tài liệu này mô tả 2 luồng nghiệp vụ cốt lõi nhất của toàn bộ hệ thống POS & KDS.

## 1. Luồng Đặt món qua QR Code & Chế biến KDS

Đây là luồng "không chạm", nơi khách hàng tự phục vụ và đầu bếp nhận thông tin tức thì.

1. **Khách hàng quét mã QR (Customer Web):**
   - Khách quét mã tại bàn, truy cập web, chọn món, size, topping và nhập ghi chú.
   - Khi bấm "Thanh toán", web gọi `POST /orders` qua API Gateway.
2. **Xử lý Đơn hàng (Order Service):**
   - Gateway forward sang `order-service`. 
   - `order-service` lưu vào DB (Trạng thái đơn: `PENDING`, Trạng thái các món: `PENDING`).
   - `order-service` phát sự kiện Socket `newOrder` lên kênh realtime.
3. **Hiển thị Bếp (KDS Web):**
   - Ứng dụng KDS tại bếp nhận sự kiện `newOrder` qua Socket.IO và render ngay đơn hàng mới lên màn hình kèm bộ đếm thời gian.
4. **Bếp chế biến:**
   - Đầu bếp bấm nút **"Bắt đầu làm"**. KDS gọi `PATCH /orders/:id/items/:itemId` (Trạng thái món: `IN_PROGRESS`).
   - Đầu bếp bấm **"Hoàn thành"**. Món chuyển sang `COMPLETED`.
   - Nếu tất cả các món trong đơn đều `COMPLETED`, toàn bộ đơn được đánh dấu hoàn thành chế biến, KDS tự động ẩn thẻ đơn đó.

---

## 2. Luồng Thanh toán Tự động (PayOS) & Trừ Kho Bất đồng bộ

Đây là luồng tác nghiệp của Thu ngân và sự kết hợp ngầm của các Microservices cùng Cổng thanh toán.

1. **Quản lý Sơ đồ Bàn (POS Web):**
   - Khi có đơn hàng `PENDING` tạo từ mã QR của Bàn 12, Sơ đồ bàn trên màn hình POS lập tức nháy đỏ/cam báo hiệu Bàn 12 đang có khách và cần thanh toán.
2. **Thanh toán VietQR Tự động (PayOS):**
   - Thu ngân bấm vào Bàn 12. Modal thanh toán hiện lên, hệ thống gọi `POST /payments/payos/create` lấy mã VietQR động (gắn sẵn số tiền và `orderCode`).
   - Khách hàng dùng App Ngân hàng quét và chuyển khoản.
   - **Cách 1 (Webhook):** PayOS chủ động gọi Webhook về `api-gateway`. Gateway bắn Message qua RabbitMQ báo `order-service` cập nhật đơn thành `COMPLETED` và phát sự kiện `order:paid` qua Socket.IO.
   - **Cách 2 (Polling Backup):** POS Web ngầm gọi `POST /payments/payos/status` mỗi 3 giây. Khi báo `PAID`, POS tự kích hoạt đóng đơn.
3. **In Hóa Đơn & Đóng Đơn:**
   - Ngay khi nhận tín hiệu thanh toán thành công (qua Socket hoặc Polling), Modal tự đóng, trình duyệt tự động mở cửa sổ Print chuẩn khổ giấy 80mm bằng CSS `@media print` + React Portal.
4. **Trừ Kho Ngầm (RabbitMQ & Inventory Service):**
   - Cùng thời điểm đơn chuyển sang `COMPLETED`, `order-service` phát một Event: `client.emit('order_completed', orderData)`.
   - `inventory-service` liên tục lắng nghe Event này. Khi nhận được, nó bóc tách dữ liệu `items`, tra cứu định lượng nguyên vật liệu và thực hiện phép trừ (-) số lượng tồn kho trong `inventory_db`.
   - Luồng này đảm bảo khách hàng và Thu ngân trải nghiệm tốc độ phản hồi tính bằng mili-giây, còn việc trừ kho nặng nhọc cứ để Message Broker lo liệu dưới nền!
5. **Thông báo Bếp (KDS) & POS:**
   - Khi bếp hoàn thành món ăn, KDS gọi API cập nhật trạng thái.
   - Server đẩy thông báo qua Socket.IO lên màn hình POS (chuông thông báo) báo cho Thu ngân món đã sẵn sàng phục vụ.
