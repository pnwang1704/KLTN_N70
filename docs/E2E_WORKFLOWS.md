# Luồng Nghiệp Vụ Đầu-Cuối (End-to-End Workflows)

Tài liệu này cung cấp các sơ đồ tuần tự (Sequence Diagrams) chuẩn Mermaid và phân tích chi tiết các luồng nghiệp vụ cốt lõi trong hệ thống F&B Multi-branch.

---

## 1. Luồng Xác thực & Kiểm soát Phân quyền (Authentication & RBAC Guard)

Đảm bảo an toàn thông tin với kiến trúc Stateless JWT kết hợp kiểm soát phân quyền dựa trên vai trò (Role-Based Access Control) tại API Gateway.

```mermaid
sequenceDiagram
    autonumber
    actor User as Nhân viên / Quản lý
    participant Client as POS / KDS Web
    participant GW as API Gateway (Port 3000)
    participant AS as Auth Service (Port 3001)
    participant DB as Auth DB

    %% Đăng nhập
    Note over User, DB: Giai đoạn 1: Đăng nhập hệ thống
    User->>Client: Nhập Username & Password
    Client->>GW: POST /auth/login
    GW->>AS: RabbitMQ RPC: { cmd: 'login' }
    AS->>DB: Truy vấn User theo username
    DB-->>AS: Trả về bản ghi User (Password hash)
    AS->>AS: Xác minh mật khẩu (Bcrypt compare)
    AS->>AS: Ký phát JWT Token (chứa userId, role, branchId)
    AS-->>GW: Trả về Access Token & Profile
    GW-->>Client: HTTP 200 OK (accessToken, user)
    Client->>Client: Lưu Token vào LocalStorage

    %% Thực thi Request có bảo vệ
    Note over User, DB: Giai đoạn 2: Thực thi Request có phân quyền
    User->>Client: Thao tác chức năng (vd: Quản lý nhân viên)
    Client->>GW: GET /auth/users (Header: Bearer Token)
    GW->>AS: RabbitMQ RPC: { cmd: 'validate_token' }
    AS-->>GW: Trả về Token hợp lệ (role = 'MANAGER')
    GW->>GW: RolesGuard kiểm tra: Role có trong @Roles('ADMIN', 'MANAGER')?
    alt Role hợp lệ
        GW->>AS: RabbitMQ RPC: { cmd: 'get_users' }
        AS->>DB: Lấy danh sách nhân viên
        DB-->>AS: Danh sách users
        AS-->>GW: Users data
        GW-->>Client: HTTP 200 OK (Danh sách nhân viên)
    else Role không hợp lệ
        GW-->>Client: HTTP 403 Forbidden (Không đủ thẩm quyền)
    end
```

---

## 2. Luồng Khách Đặt Món Tại Bàn (Dine-in Post-pay) & Tự Động Nhận Diện Bàn (Auto-redirect)

Khách hàng quét mã QR tại bàn ăn để gọi món theo mô hình **Thanh toán sau tại quầy (Post-pay)**. Hệ thống hỗ trợ tự động nhận diện bàn qua URL, gọi nhiều đợt trong bữa ăn và tra cứu danh sách món đã gọi theo thời gian thực.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Khách hàng tại bàn
    participant Mobile as Customer Web (QR / Port 5174)
    participant GW as API Gateway (Port 3000)
    participant OS as Order Service (Port 3004)
    participant KDS as KDS Web (Port 5173)
    participant DB as Order DB

    %% Giai đoạn 1: Quét QR & Tự động nhận diện bàn
    Note over Customer, Mobile: Giai đoạn 1: Quét mã QR & Tự động chuyển hướng (Auto-redirect)
    Customer->>Mobile: Quét mã QR tại bàn (vd: http://localhost:5174/?branchId=1&tableId=5)
    alt URL có chứa branchId & tableId
        Mobile->>Mobile: Tự động lưu branchId=1, tableId=5 vào LocalStorage
        Mobile->>Mobile: Tự động chuyển hướng thẳng vào Menu món (/menu)
    else URL không có tham số (Fallback Screen)
        Mobile->>Customer: Hiển thị giao diện Mobile-first có Hero Banner & lưới chọn nhanh số bàn (1, 2, 3...)
        Customer->>Mobile: Bấm chọn Bàn 5 -> Chuyển sang Menu món
    end

    %% Giai đoạn 2: Gọi món đợt 1
    Note over Customer, DB: Giai đoạn 2: Khách gửi đơn đợt 1 (Đồ uống)
    Customer->>Mobile: Chọn món, chọn Size (M/L), Topping, Ghi chú
    Customer->>Mobile: Bấm "Gửi đơn gọi món" (Đợt 1)
    Mobile->>GW: POST /orders (orderType: 'AT_TABLE', tableId: '5', items, totalAmount)
    GW->>OS: RabbitMQ RPC: { cmd: 'create_order' }
    OS->>DB: Lưu đơn hàng (status = 'PENDING', items.itemStatus = 'PENDING')
    DB-->>OS: Đơn hàng mới (id_1, orderCode_1)
    OS->>KDS: Socket.IO Emit 'NEW_ORDER_CREATED' tới room branch_1
    OS-->>GW: Trả về thông tin Order đợt 1
    GW-->>Mobile: HTTP 201 Created (Order data)
    KDS->>KDS: Chuông báo ting ting & hiện thẻ đơn Bàn 5 trên màn hình bếp
    Mobile->>Customer: Màn hình "Đặt món thành công! Vui lòng thanh toán tại quầy khi dùng bữa xong"

    %% Giai đoạn 3: Gọi món đợt 2 & Tra cứu món đã gọi
    Note over Customer, DB: Giai đoạn 3: Khách gọi thêm đợt 2 & Tra cứu lịch sử món tại bàn
    Customer->>Mobile: Chọn thêm món đợt 2 (Cà phê / Bánh ngọt)
    Customer->>Mobile: Bấm "Gửi đơn gọi món" (Đợt 2)
    Mobile->>GW: POST /orders (orderType: 'AT_TABLE', tableId: '5', items_2)
    GW->>OS: RabbitMQ RPC: { cmd: 'create_order' }
    OS->>DB: Lưu đơn đợt 2 (id_2, status = 'PENDING')
    OS->>KDS: Socket.IO Emit 'NEW_ORDER_CREATED' (Đợt 2)
    GW-->>Mobile: HTTP 201 Created
    
    Customer->>Mobile: Bấm nút "Món đã gọi" (Receipt Icon trên Header)
    Mobile->>GW: GET /orders/active?branchId=1&tableId=5
    GW->>OS: RabbitMQ RPC: { cmd: 'get_active_orders' }
    OS->>DB: Truy vấn các đơn của Bàn 5 có status != COMPLETED && status != CANCELLED
    DB-->>OS: Trả về danh sách [Order đợt 1, Order đợt 2]
    OS-->>GW: Active Orders data
    GW-->>Mobile: HTTP 200 OK
    Mobile->>Customer: Mở Drawer hiển thị gộp tất cả món qua các đợt gọi & Tổng tạm tính chung của bàn
```

---

## 3. Luồng Chế Biến Tại Bếp & Thông Báo Món Hoàn Thành (KDS -> POS)

Đầu bếp quản lý tiến độ thực đơn qua KDS. Khi món ăn hoàn thành, hệ thống gửi thông báo Realtime lên màn hình Thu ngân tại quầy POS.

```mermaid
sequenceDiagram
    autonumber
    actor Chef as Đầu bếp
    participant KDS as KDS Web
    participant GW as API Gateway
    participant OS as Order Service
    participant POS as POS Web (Quầy thu ngân)
    participant DB as Order DB

    Chef->>KDS: Bấm "Bắt đầu làm" trên từng món
    KDS->>GW: PATCH /orders/:id/items/:itemId (itemStatus: 'IN_PROGRESS')
    GW->>OS: Forward request
    OS->>DB: Cập nhật itemStatus = 'IN_PROGRESS'
    OS-->>KDS: HTTP 200 OK (Cập nhật giao diện thẻ vàng)

    Chef->>KDS: Nấu xong, bấm "Hoàn thành"
    KDS->>GW: PATCH /orders/:id/items/:itemId (itemStatus: 'COMPLETED')
    GW->>OS: Forward request
    OS->>DB: Cập nhật itemStatus = 'COMPLETED'
    
    %% Realtime notify POS
    OS->>POS: Socket.IO Emit 'ITEM_READY' (branchId, itemInfo)
    OS-->>KDS: HTTP 200 OK (Đổi màu thẻ xanh)
    
    POS->>POS: Hiển thị Toast thông báo nổi: "Món [Trà Sữa] của Bàn 05 đã sẵn sàng phục vụ!"
    POS->>POS: Thêm thông báo vào Chuông thông báo (Notification Dropdown)
    
    opt Tất cả các món trong đơn hoàn thành
        KDS->>KDS: Tự động ẩn thẻ đơn khỏi màn hình chế biến
    end
```

---

## 4. Luồng Chiết Khấu, Thanh Toán Bàn Tại Quầy POS & Trừ Kho Bất Đồng Bộ (SAGA)

Thu ngân tiếp nhận yêu cầu thanh toán của khách, xem toàn bộ món gộp từ các đợt gọi, áp dụng chiết khấu, thu tiền (Tiền mặt hoặc VietQR PayOS), in hóa đơn gộp chuẩn xác, phát tín hiệu giải phóng bàn theo thời gian thực và kích hoạt trừ kho ngầm qua RabbitMQ.

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Thu ngân
    participant POS as POS Web (Port 5175)
    participant CW as Customer Web (Port 5174)
    participant GW as API Gateway (Port 3000)
    participant OS as Order Service (Port 3004)
    participant PayOS as Cổng PayOS (VietQR)
    participant RMQ as RabbitMQ Broker
    participant IS as Inventory Service
    participant DB_O as Order DB
    participant DB_I as Inventory DB

    Cashier->>POS: Chọn Bàn 5 trên Sơ đồ bàn (Đang phục vụ)
    POS->>POS: Hiển thị gộp toàn bộ danh sách món từ các đợt gọi & Tổng tạm tính
    POS->>POS: Nhập Chiết khấu (% hoặc VNĐ) ngay tại chân OrderPanel
    POS->>POS: Tự động tính: finalTotal = subtotal - discountAmount
    Cashier->>POS: Bấm "Thanh toán bàn này" -> Mở PaymentModal (nhận đúng finalTotal)

    alt Phương thức: TIỀN MẶT (CASH)
        Cashier->>POS: Chọn mệnh giá nhanh hoặc nhập tiền khách đưa
        POS->>POS: Hiển thị tiền thối lại (changeAmount = amountPaid - finalTotal)
        Cashier->>POS: Bấm "Xác nhận Thanh toán"
        POS->>GW: POST /orders/pay-table (branchId: '1', tableId: '5', paymentMethod: 'CASH', amountPaid)
        GW->>OS: RabbitMQ RPC: 'pay_table_orders'
        OS->>DB_O: Tìm các đơn active của Bàn 5 (status != COMPLETED && status != CANCELLED)
        Note over OS, DB_O: Hợp nhất các đợt gọi thành 1 hóa đơn:<br/>- Gán toàn bộ món của đợt phụ vào primaryOrder<br/>- Cập nhật totalAmount & finalAmount gộp<br/>- Đổi status = COMPLETED & Xóa đơn phụ rỗng
        OS->>DB_O: Lưu primaryOrder & Payment
        OS-->>GW: Trả về kết quả thanh toán thành công
        GW-->>POS: HTTP 200 OK
    else Phương thức: CHUYỂN KHOẢN (VIETQR - PAYOS)
        Cashier->>POS: Chọn tab "Chuyển khoản (QR)"
        POS->>GW: POST /payments/payos/create (orderId, orderCode, totalAmount: finalTotal)
        GW->>PayOS: Gọi PayOS API tạo mã VietQR động
        PayOS-->>GW: Trả về link VietQR (kèm Bin, Số tài khoản, Số tiền chính xác)
        GW-->>POS: Trả về link mã VietQR
        POS->>POS: Hiển thị hình ảnh mã VietQR trên màn hình
        
        actor Customer as Khách hàng
        Customer->>PayOS: Quét mã VietQR và chuyển khoản bằng Mobile Banking
        PayOS->>GW: Webhook POST /webhooks/payos (Báo thanh toán thành công)
        GW->>OS: RabbitMQ Message: 'process_payos_webhook'
        OS->>DB_O: Tự động gọi hợp nhất và hoàn tất thanh toán cho bàn
        OS->>POS: Socket.IO Emit 'order:paid'
        POS->>POS: Nhận tín hiệu, tự động đóng Modal thanh toán
    end

    %% Giải phóng bàn Realtime
    Note over OS, CW: Giải phóng bàn ăn Realtime qua Socket.IO
    OS->>CW: Socket.IO Emit 'table:completed' (branchId: '1', tableId: '5')
    OS->>POS: Socket.IO Emit 'table:completed' (branchId: '1', tableId: '5')
    CW->>CW: Đóng Drawer món đã gọi, xóa giỏ hàng & reset màn hình bàn
    POS->>POS: Đổi trạng thái Bàn 5 trên Sơ đồ bàn sang Bàn trống (Màu xanh)

    %% In hóa đơn
    POS->>POS: Kích hoạt in hóa đơn nhiệt tự động (Receipt khổ 80mm):<br/>Hiển thị đầy đủ tất cả món của các đợt gọi, Tạm tính, Chiết khấu, TỔNG CỘNG, Tiền khách đưa, Tiền thối

    %% Trừ kho bất đồng bộ SAGA
    Note over OS, DB_I: Cơ chế Event-Driven Trừ kho ngầm (Background Task)
    OS-)RMQ: Event Emit: 'order_completed' (orderId, branchId, items)
    RMQ-)IS: Consumer nhận sự kiện 'order_completed'
    IS->>DB_I: Mở TypeORM Transaction (QueryRunner)
    loop Từng món và Topping trong đơn gộp
        IS->>DB_I: Tra cứu Recipe theo productId & size
        IS->>DB_I: Kiểm tra tồn kho nguyên liệu trong BranchStock
        alt Đủ nguyên liệu
            IS->>DB_I: Trừ số lượng tồn kho & Lưu StockTransaction
        else Thiếu nguyên liệu
            IS->>IS: Rollback Transaction & Ghi log cảnh báo kho
        end
    end
    IS->>DB_I: Commit Transaction hoàn tất trừ kho
```
