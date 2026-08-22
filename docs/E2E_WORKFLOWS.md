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

## 2. Luồng Thanh toán tại Quầy & Trừ Kho Bất đồng bộ

Đây là luồng tác nghiệp của Thu ngân và sự kết hợp ngầm của các Microservices.

1. **Quản lý Sơ đồ Bàn (POS Web):**
   - Khi có đơn hàng `PENDING` tạo từ mã QR của Bàn 12, Sơ đồ bàn trên màn hình POS lập tức nháy đỏ/cam báo hiệu Bàn 12 đang có khách và cần thanh toán.
2. **Thanh toán & In Hóa Đơn:**
   - Thu ngân bấm vào Bàn 12. Modal thanh toán (PaymentModal) hiện lên.
   - Nhập số tiền khách đưa, tính tiền thối. Bấm **"Hoàn tất thanh toán"**.
   - Trình duyệt tự động mở cửa sổ Print chuẩn khổ giấy 80mm bằng CSS `@media print` + React Portal.
3. **Cập nhật Trạng thái (Order Service):**
   - POS gọi `PATCH /orders/:id/status` với trạng thái `COMPLETED` và lưu thông tin `payment`.
4. **Trừ Kho Ngầm (RabbitMQ & Inventory Service):**
   - Sau khi cập nhật DB thành công, `order-service` không gọi trực tiếp sang module Kho để tránh nghẽn cổ chai (Bottleneck).
   - Nó phát một Event: `client.emit('order_completed', orderData)`.
   - `inventory-service` liên tục lắng nghe Event này. Khi nhận được, nó bóc tách dữ liệu `items`, tra cứu định lượng nguyên vật liệu và thực hiện phép trừ (-) số lượng tồn kho trong `inventory_db`.
   - Luồng này đảm bảo Thu ngân được trả kết quả "Thanh toán thành công" trong nháy mắt, còn việc trừ kho nặng nhọc cứ để Message Broker lo liệu dưới nền!
