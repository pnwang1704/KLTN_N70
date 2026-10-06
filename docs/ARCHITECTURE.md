# Kiến Trúc Hệ Thống (System Architecture)

Hệ thống được thiết kế theo mô hình **Microservices Architecture** kết hợp **Event-Driven Architecture (EDA)** nhằm đảm bảo tính độc lập, khả năng mở rộng quy mô linh hoạt (scalability) và độ chịu lỗi cao cho chuỗi F&B đa chi nhánh.

---

## 1. Sơ đồ Kiến trúc Tổng thể (Overall System Architecture)

```mermaid
graph TB
    %% Client Layer
    subgraph Clients ["Lớp Ứng Dụng Người Dùng (Client Layer)"]
        CW["Customer Web (Mobile QR / Port 5174)<br/>- Auto-redirect Table URL<br/>- Tra cứu Món đã gọi tại bàn"]
        POS["POS Web (Port 5175)<br/>- Thu ngân / Sơ đồ bàn / Chiết khấu<br/>- Ca làm việc động & Đối soát két<br/>- Kiosk Chấm công AI (@vladmandic/face-api)<br/>- Quản lý Nhân sự & Bảng công"]
        KDS["KDS Web (Port 5173)<br/>- Màn hình Bếp điều phối Realtime"]
    end

    %% External Services
    subgraph External ["Dịch Vụ Bên Ngoài (Third-party)"]
        PayOS["Cổng Thanh Toán PayOS (VietQR)"]
    end

    %% API Gateway Layer
    subgraph Gateway ["Cổng Điều Phối (API Gateway Layer)"]
        GW["API Gateway (Port 3000)<br/>- Global JWT AuthGuard<br/>- RBAC RolesGuard<br/>- PayOS Controller & Webhooks"]
    end

    %% Message Broker
    subgraph Broker ["Hạ Tầng Tin Nhắn (Message Broker)"]
        RMQ{{"RabbitMQ Broker (Port 5672 / 15672)<br/>(Exchanges & Queues)"}}
    end

    %% Microservices Layer
    subgraph Services ["Lớp Dịch Vụ Nghiệp Vụ (Microservices Layer)"]
        AS["Auth Service (Port 3001)<br/>(Bcrypt, JWT, RBAC)"]
        OS["Order Service (Port 3004)<br/>- Order Lifecycle & Table Consolidate<br/>- Quỹ tiền mặt (Cash Flow & Shift Summary)<br/>- Quản lý Ca động (Shift Management)<br/>- Nhân sự & Chấm công Sinh trắc học (Employee & Attendance)<br/>- Socket.IO Realtime Gateway"]
        IS["Inventory Service<br/>- Recipe Management<br/>- Transactional Deduct Stock"]
        BS["Branch Service<br/>(Bàn ăn, Chi nhánh)"]
        PS["Product Service<br/>(Menu, Size, Topping)"]
        RS["Reporting Service<br/>(Doanh thu, Báo cáo)"]
    end

    %% Database Layer
    subgraph Databases ["Lớp Dữ Liệu Bền Vững (Database-per-Service)"]
        DB1[("Auth DB<br/>(PostgreSQL 5432)")]
        DB2[("Order DB<br/>(PostgreSQL 5435)<br/>Orders, Expenses, Shifts,<br/>Employees, Attendances")]
        DB3[("Inventory DB<br/>(PostgreSQL 5436)")]
        DB4[("Branch DB<br/>(PostgreSQL 5437)")]
        DB5[("Product DB<br/>(PostgreSQL 5434)")]
        DB6[("Reporting DB<br/>(PostgreSQL 5438)")]
    end

    %% Client Interactions
    CW -->|"HTTP REST (Create Order, Active Orders)"| GW
    POS -->|"HTTP REST (Order, Pay Table, Staff, Stock)"| GW
    KDS -->|"HTTP REST (Update Item Status)"| GW

    %% Realtime WebSocket
    OS -.->|"Socket.IO (NEW_ORDER_CREATED)"| KDS
    OS -.->|"Socket.IO (ITEM_READY, order:paid)"| POS
    OS -.->|"Socket.IO (table:completed)"| CW
    OS -.->|"Socket.IO (table:completed)"| POS

    %% External PayOS Integration
    GW <-->|"Tạo VietQR & Nhận Webhook"| PayOS

    %% Gateway to Microservices (RPC via RabbitMQ)
    GW <-->|"RabbitMQ RPC (TCP)"| AS
    GW <-->|"RabbitMQ RPC (TCP)"| OS
    GW <-->|"RabbitMQ RPC (TCP)"| IS

    %% Event Pub/Sub
    OS -.->|"Event: order_completed"| RMQ
    RMQ -.->|"Consume Event"| IS
    RMQ -.->|"Consume Event"| RS

    %% Database Connections
    AS --> DB1
    OS --> DB2
    IS --> DB3
    BS --> DB4
    PS --> DB5
    RS --> DB6
```

---

## 2. Database-per-Service Pattern & Persistent Storage

Hệ thống áp dụng triệt để nguyên lý **Database-per-Service**: mỗi Microservice quản lý toàn quyền một cơ sở dữ liệu PostgreSQL độc lập, ngăn chặn hoàn toàn việc join bảng xuyên service hay vi phạm tính đóng gói.

### Cơ chế Named Persistent Volumes trong Docker
Nhằm giải quyết triệt để rủi ro mất dữ liệu khi container bị dừng hoặc dựng lại (`docker compose down` / `docker compose up -d --build`), toàn bộ cơ sở dữ liệu và message broker được gắn với các **Named Volumes** bền vững tại `docker-compose.yml`:

| Dịch vụ Container | Cổng Host | Named Volume | Đường dẫn Mount trong Container | Thực thể chính (Core Entities) |
| :--- | :--- | :--- | :--- | :--- |
| `fnb_postgres_auth` | `5432` | `postgres_auth_data` | `/var/lib/postgresql/data` | `users` (credentials, roles, branchId) |
| `fnb_postgres_product`| `5434` | `postgres_product_data` | `/var/lib/postgresql/data` | `products`, `categories`, `product_sizes`, `toppings`, `branch_product_availabilities` |
| `fnb_postgres_order` | `5435` | `postgres_order_data` | `/var/lib/postgresql/data` | `orders`, `order_items`, `order_item_toppings`, `payments`, `expenses`, `shifts`, `employees` (face vectors 128D), `attendances` |
| `fnb_postgres_inventory`| `5436` | `postgres_inventory_data` | `/var/lib/postgresql/data` | `ingredients`, `branch_stocks`, `recipes`, `recipe_items`, `stock_transactions` |
| `fnb_postgres_branch` | `5437` | `postgres_branch_data` | `/var/lib/postgresql/data` | `branches`, `tables` |
| `fnb_postgres_reporting`| `5438` | `postgres_reporting_data` | `/var/lib/postgresql/data` | `daily_reports`, `revenue_summaries` |
| `fnb_rabbitmq` | `5672`, `15672`| `rabbitmq_data` | `/var/lib/rabbitmq` | Message queues, exchanges, bindings |

---

## 3. Kiến Trúc Hướng Sự Kiện & Tính Toàn Vẹn (Event-Driven & SAGA)

Nhằm tối ưu thời gian phản hồi cho các giao dịch tại quầy thu ngân (POS) và giảm độ trễ cho người dùng:
1. **Giao tiếp Bất đồng bộ (Pub/Sub):** Khi một đơn hàng hoàn tất thanh toán (`status = COMPLETED`), `order-service` phát sự kiện `order_completed` lên RabbitMQ exchange rồi trả về kết quả ngay cho POS mà không cần chờ kho phản hồi.
2. **Transaction Rollback tại Inventory Service:**
   - `inventory-service` nhận sự kiện `order_completed` và mở một **TypeORM Database Transaction** thông qua `QueryRunner`.
   - Với từng sản phẩm trong đơn, hệ thống tra cứu công thức định mức (`Recipe`) theo đúng `size` và `toppings`.
   - Nếu số lượng nguyên liệu trong kho đủ đáp ứng, hệ thống ghi nhận trừ kho (`quantity - required`) và chốt giao dịch (`commitTransaction`).
   - Nếu bất kỳ nguyên liệu nào không đủ tồn kho, toàn bộ giao dịch được hoàn tác tự động (`rollbackTransaction`) và phát cảnh báo kiểm kho, bảo vệ toàn vẹn dữ liệu. Cơ chế này đã được xác thực qua bộ Jest Unit Tests độc lập.

---

## 4. Socket.IO Realtime Gateway & Phân Tách Chi Nhánh (Room Isolation)

Order Service tổ chức một WebSocket Server độc lập lắng nghe tại cổng `3004`:
- **Room Isolation (`joinBranchRoom`):** Khi POS Web, KDS Web hoặc Customer Web khởi chạy, ứng dụng gửi sự kiện `joinBranchRoom(branchId)`. Socket Server sẽ đưa client vào room riêng biệt (ví dụ: `branch_1`, `branch_2`).
- **Phân phối sự kiện đúng địa chỉ:**
  - Đơn hàng mới từ QR bàn chi nhánh 1 chỉ kích hoạt thông báo trên màn hình KDS của chi nhánh 1 (`NEW_ORDER_CREATED`).
  - Món hoàn thành tại bếp chi nhánh 1 chỉ kích hoạt âm báo và Toast nổi trên POS của chi nhánh 1 (`ITEM_READY`).
  - Đơn hàng thanh toán thành công qua PayOS chỉ gửi tín hiệu `order:paid` tới quầy thu ngân của chi nhánh đó.
  - Khi thu ngân xác nhận thanh toán bàn tại POS, `order-service` phát sự kiện `table:completed` (kèm `branchId`, `tableId`, `orderId`) tới toàn room: Customer Web tại bàn đó lập tức đóng modal món đã gọi, xóa giỏ hàng và giải phóng bàn; đồng thời POS Web cập nhật sơ đồ bàn về trạng thái Bàn trống.

---

## 5. Mô Hình Bảo Mật: Stateless JWT & Phân Quyền Vai Trò (RBAC)

API Gateway đóng vai trò chốt chặn kiểm soát truy cập (Single Entry Guard):
1. **Xác thực Stateless JWT & Các Endpoint Công cộng (@Public):** Mọi request (trừ các endpoint `@Public`) đều phải gửi kèm Header `Authorization: Bearer <token>`. Gateway ủy quyền giải mã token sang `auth-service` qua RabbitMQ pattern `{ cmd: 'validate_token' }`.
   - **Cơ chế Ngoại lệ cho Kiosk Chấm công (@Public):** Các endpoint `POST /attendances/check-in`, `POST /attendances/check-out` và `GET /employees` được gắn decorator `@Public()`. `JwtAuthGuard` và `RolesGuard` cho phép các luồng này thực thi tự do mà không bắt buộc có Bearer Token, giúp nhân viên có thể chấm công sinh trắc học ngay từ Màn hình Đăng nhập (Login Screen). Nếu client có truyền token (khi đã login), Guard vẫn tự động trích xuất thông tin người dùng (`req.user`) để lấy `branchId` và `role`.
2. **Phân quyền dựa trên vai trò (RBAC RolesGuard):** Hệ thống phân định 5 nhóm vai trò cụ thể:
   - `ADMIN`: Toàn quyền quản trị hệ thống, chuỗi chi nhánh và tài khoản.
   - `MANAGER`: Quản lý kho, nhân sự và đơn hàng trong phạm vi chi nhánh phụ trách.
   - `CASHIER`: Thu ngân tại quầy POS, xử lý tạo đơn, chiết khấu và hoàn tất thanh toán.
   - `KITCHEN`: Nhân viên bếp thao tác cập nhật trạng thái món trên KDS Web.
   - `WAITER`: Nhân viên phục vụ hỗ trợ gọi món và chăm sóc khách tại bàn.
   - Nếu tài khoản không thuộc danh sách `@Roles(...)` được phép trên controller, Gateway trả về mã lỗi `403 Forbidden` ngay tức thì (bỏ qua kiểm tra nếu endpoint là `@Public`).

---

## 6. Cơ Chế Quản Lý Quỹ Tiền Mặt Vận Hành Tức Thời (Operational Cash Flow Architecture)

Nhằm đáp ứng yêu cầu kiểm soát tài chính minh bạch, ngăn chặn thất thoát tiền mặt và hỗ trợ quy trình bàn giao ca trực tiếp tại quầy thu ngân (POS Cash Drawer Handover), hệ thống triển khai kiến trúc dòng tiền vận hành (Operational Cash Flow) tức thời tại `order-service` và `pos-web`:

### 6.1. Sơ đồ Luân chuyển Dòng tiền tại Quầy (Cash In / Cash Out Flow)

```mermaid
flowchart TD
    subgraph ShiftStart ["1. Mở Ca Làm Việc"]
        SC["Thu ngân chọn ca: Ca 1 hoặc Ca 2"] --> IC["Nhập Tiền đầu ca nhận bàn giao: initialCash"]
        IC --> SS["Lưu pos_shift vào LocalStorage & Quản lý State"]
    end

    subgraph Operations ["2. Vận Hành Trong Ca"]
        SALE_CASH["Bán hàng Thu Tiền mặt"] -->|"Cash In (+totalCash)"| DRAWER[("Két Tiền Mặt Vật Lý Tại Quầy")]
        SALE_BANK["Bán hàng Chuyển khoản VietQR (PayOS)"] -->|"Chuyển thẳng (+totalBankTransfer)"| BANK[("Tài Khoản Ngân Hàng Napas 247")]
        EXP["Chi tiền mặt khẩn cấp (Mua đá, chanh, đồ dùng)"] -->|"Cash Out (-totalExpense)"| DRAWER
        EXP -->|"POST /orders/expenses"| EXP_DB[("Bảng expenses trong Order DB")]
    end

    subgraph ShiftClose ["3. Báo Cáo Kết Ca & Bàn Giao"]
        DRAWER -->|"Đối soát tiền két thực tế"| SUMMARY["ShiftSummaryModal"]
        EXP_DB -->|"GET /orders/shift-summary"| SUMMARY
        BANK -->|"Đối chiếu tổng chuyển khoản"| SUMMARY
        
        SUMMARY --> CALC["Chốt két: closingCash = initialCash + totalCash - totalExpense"]
        SUMMARY --> REV["Doanh thu ca: totalRevenue = totalCash + totalBankTransfer"]
        CALC --> PRINT["In Phiếu Bàn Giao Kết Ca 80mm qua Hidden Iframe"]
    end

    SS --> SALE_CASH
    SS --> EXP
```

### 6.2. Các Nguyên Tắc Nghiệp Vụ Tài Chính Cốt Lõi
1. **Tiền đầu ca nhận bàn giao (`initialCash` - Opening Cash):**
   - Thu ngân nhận két từ ca trước với lượng tiền mặt lẻ nhất định dùng để thối lại cho khách.
   - Số tiền này được nhập tại `ShiftSelectModal` qua bộ gõ Input Mask mượt mà và lưu vào phiên ca `pos_shift`.
2. **Tính độc lập giữa Doanh thu và Dòng tiền két (Sales Revenue vs. Cash Drawer Balance):**
   - **Doanh thu bán hàng ca trực:** $\text{totalRevenue} = \text{totalCash} + \text{totalBankTransfer}$. Doanh thu phản ánh đúng giá trị hàng hóa đã bán ra, tuyệt đối **không bị trừ** bởi các khoản chi tiêu vận hành.
   - **Tiền mặt trong két thực tế bàn giao:** $\text{closingCash} = \text{initialCash} + \text{totalCash} - \text{totalExpense}$. Khoản chi tiền mặt (`totalExpense`) là chi phí vận hành (OPEX), trực tiếp làm giảm lượng tiền mặt vật lý nằm trong két nhưng không làm giảm doanh số bán hàng.
3. **Quản lý Phiếu chi tiền mặt (`ExpenseModal.tsx` & `Expense` Entity):**
   - Mọi khoản trích tiền mặt từ két (mua đá cây, nước ngọt, phụ phẩm khẩn cấp) đều phải được tạo phiếu chi với lý do và người nhận rõ ràng.
   - Hỗ trợ in tức thời **Phiếu chi tiền mặt 80mm** (Cash Out Voucher) có đầy đủ chữ ký của Người nhận tiền và Người lập phiếu để kẹp vào két lưu trữ chứng từ đối soát.

### 6.3. Luồng Tương tác UI trên `pos-web`
1. **Top Header Siêu Tinh Gọn:**
   - Xóa bỏ hoàn toàn chữ logo "N70 POS", đưa nút menu ☰, tab "Bán hàng" và nút Badge "Đơn tạm tính" lên vị trí khởi đầu góc trái.
   - Nút Badge "Đơn tạm tính" hiển thị số lượng hóa đơn lưu tạm hiện tại; khi có đơn ($N > 0$), badge số tự động kích hoạt hiệu ứng `animate-pulse` trên nền xanh dương đậm `bg-blue-600 text-white` để nhắc nhở nhân viên.
   - Chuyển toàn bộ thông tin chi nhánh, tên người dùng và badge ca trực ra khỏi Top Header vào Side Drawer, giúp thanh Top Header thoáng đãng và giảm tải nhận thức cho thu ngân.
   - Góc phải duy trì: Nút 1-chạm *"⏰ Chấm công Kiosk"*, Trạng thái mạng *"Connected"*, Chuông thông báo bếp và Nút Đăng xuất.
2. **Thanh Trượt Side Menu Drawer (`SideMenuDrawer`):**
   - Được kích hoạt từ nút icon menu vuông bo góc (`w-10 h-10`) ở góc trái Header, trượt mượt mà từ mép trái màn hình (`w-80`, backdrop mờ, phím Escape đóng nhanh):
     - **Profile & Session Card (Header Drawer):** Thiết kế nổi bật trên nền gradient xanh CukCuk `from-blue-600 via-blue-700 to-sky-600`, nút đóng `[✕]`, avatar tròn, tên hiển thị in đậm, chi nhánh hoạt động và badge ca trực hiện tại kèm icon đồng hồ (hỗ trợ nhấp để đổi ca làm việc).
     - **Thân Drawer (Body):**
       - 📋 **Lịch sử đơn hàng:** Xem các đơn hàng trong ca trực hiện tại.
       - 📄 **Hóa đơn tạm tính:** Xem và quản lý các đơn đang lưu tạm; hiển thị badge số lượng đơn.
       - 📊 **Báo cáo kết ca (`ShiftSummaryModal`):** Hiển thị thống kê tài chính, tiền chi, bảng kê phiếu chi và in Phiếu kết ca 80mm.
       - 💸 **Tạo phiếu chi tiền mặt (`ExpenseModal`):** Tạo phiếu chi kèm in hóa đơn nhiệt 80mm; biểu mẫu trắng sạch không placeholder gây nhiễu.
       - ⏰ **Chấm công nhân viên (Kiosk):** Kích hoạt Kiosk nhận diện khuôn mặt trực tiếp từ Drawer.
       - Nhóm **Quản trị hệ thống** (Quản lý kho, Quản lý ca làm việc, Quản lý Nhân sự & Bảng Công) với phân quyền `ADMIN` và `MANAGER`.
     - **Footer Drawer:** Nút Đăng xuất hệ thống an toàn và thông tin phiên bản `N70 POS v1.0`.
3. **Kỹ thuật In nhiệt 80mm qua Hidden Iframe:**
   - Để tránh xung đột với các class ẩn của Single Page Application (`@media print { #root { display: none !important; } }`), các chức năng in (Phiếu chi, Phiếu kết ca) đều sử dụng một **thẻ iframe ẩn độc lập** được tạo động trong DOM, nạp HTML/CSS in nhiệt chuyên dụng khổ 80mm, kích hoạt lệnh `window.print()` và tự động hủy sau khi in xong. Giải pháp này đảm bảo tính ổn định tối đa trên mọi trình duyệt Chromium và máy in nhiệt POS thông dụng.

### 6.4. Kiến Trúc Quản Lý Hóa Đơn Tạm Tính (Hold / Draft Orders Architecture)

Nhằm giải tỏa áp lực hàng đợi tại quầy thu ngân trong giờ cao điểm khi khách hàng chưa quyết định xong giỏ hàng, hệ thống xây dựng cơ chế quản lý hóa đơn tạm tính chạy độc lập phía Client (Local State Persistence):

```mermaid
graph LR
    subgraph OrderPanel ["OrderPanel.tsx (Chân Giỏ Hàng)"]
        BTN_HOLD["Nút [💾 Lưu tạm]<br/>(Disabled khi giỏ rỗng)"]
    end

    subgraph StateManagement ["Tầng Context & Local Storage"]
        H_CTX["HeldOrdersContext.tsx<br/>- generateCode: #TAM-01, #TAM-02...<br/>- saveHeldOrder()<br/>- removeHeldOrder()<br/>- clearAllHeldOrders()"]
        LOCAL_STORAGE[("localStorage<br/>pos_held_orders")]
        CART_CTX["CartContext.tsx<br/>- loadOrderToCart()<br/>- clearCart()"]
    end

    subgraph HeaderUI ["Top Header & Drawer"]
        BADGE["Header.tsx<br/>[📄 Đơn tạm tính (N)]<br/>(animate-pulse khi N > 0)"]
        DRAWER["HeldOrdersDrawer.tsx<br/>(Slide-over từ cạnh phải w-96)<br/>- Chi tiết món & Tổng tiền xanh<br/>- Nút [↩ Phục hồi đơn]<br/>- Nút [🗑 Xóa đơn] / [Hủy tất cả]"]
    end

    BTN_HOLD -->|"Bấm Lưu tạm"| H_CTX
    H_CTX -->|"Snapshot & Tăng mã"| LOCAL_STORAGE
    H_CTX -->|"Làm sạch giỏ"| CART_CTX
    H_CTX -.->|"Cập nhật N"| BADGE
    BADGE -->|"Bấm mở"| DRAWER
    DRAWER -->|"Xác nhận Phục hồi"| CART_CTX
    DRAWER -->|"Xóa đơn sau phục hồi"| H_CTX
```

1. **Thành phần Dữ liệu Đơn Tạm (`HeldOrder` Interface):**
   - `id`: Chuỗi UUID duy nhất nhận diện phiên lưu tạm.
   - `code`: Mã định danh ngắn gọn dạng `#TAM-01`, `#TAM-02` tự động tăng dần theo ngày.
   - `createdAt`: Chuỗi thời gian lưu tạm định dạng `HH:mm:ss`.
   - `orderType`: Loại đơn hàng (`DINE_IN` hoặc `TAKE_AWAY`).
   - `tableId`: Số bàn (nếu là đơn tại bàn).
   - `items`: Mảng snapshot chi tiết toàn bộ món trong giỏ (`productId`, `productName`, `size`, `quantity`, `price`, `toppings`, `note`).
   - `subtotal`: Tổng tiền tạm tính trước chiết khấu.
   - `discountType`: Kiểu chiết khấu (`PERCENT` hoặc `AMOUNT`).
   - `discountInput`: Giá trị người dùng nhập vào ô chiết khấu.
   - `discountAmount`: Số tiền giảm trừ thực tế.
   - `finalTotal`: Số tiền thanh toán cuối cùng sau chiết khấu.
   - `note`: Ghi chú chung của đơn hàng.

2. **Cơ chế Bảo vệ Giỏ hàng Khi Phục hồi (Safe Cart Overwrite Protection):**
   - Khi thu ngân bấm `[ ↩ Phục hồi đơn ]`, component `HeldOrdersDrawer` kiểm tra xem giỏ hàng hiện tại có chứa món hay không (`cart.items.length > 0`).
   - Nếu có, hệ thống bật modal xác nhận cảnh báo: *"Giỏ hàng hiện tại đang có món. Bạn có chắc chắn muốn ghi đè bằng đơn tạm này?"*.
   - Chỉ khi người dùng xác nhận "Đồng ý", `CartContext.loadOrderToCart()` mới ghi đè giỏ hàng và đồng thời `HeldOrdersContext.removeHeldOrder()` loại bỏ đơn tạm đó khỏi danh sách chờ, tránh tình trạng mất đơn hoặc trùng lặp dữ liệu ngoài ý muốn.

---

## 7. Kiến Trúc Quản Lý Nhân Sự & Chấm Công Sinh Trắc Học AI (Biometric Attendance Architecture)

Nhằm giải quyết triệt để vấn nạn chấm công hộ (buddy punching) và tự động hóa quy trình quản trị ca kíp tại quầy, hệ thống triển khai giải pháp thị giác máy tính Client-side AI kết hợp mô hình dữ liệu tập trung tại `order-service`.

### 7.1. Sơ đồ Luồng Kiosk Chấm công Sinh trắc học Thời gian thực

```mermaid
flowchart TD
    subgraph ClientPOS ["Kiosk POS Quầy (@vladmandic/face-api)"]
        CAM["Webcam Stream (Lật gương scaleX(-1))"] --> DETECT["SSD MobileNet V1: Phát hiện khuôn mặt (200ms/frame)"]
        DETECT --> LANDMARK["68 Face Landmarks: Căn chỉnh tọa độ mắt, mũi, miệng"]
        LANDMARK --> EMBED["Face Recognition ResNet-34: Trích xuất vector đặc trưng 128D"]
        
        STAFF_SEL["Nhân viên chọn Mã NV (VD: NV01)"] --> CACHE_VEC["Nạp Vector Mẫu 128D từ Database"]
        
        EMBED --> MATCH{"Tính khoảng cách Euclid d = sqrt(sum((A_i - B_i)^2))"}
        CACHE_VEC --> MATCH
        
        MATCH -->|"d < 0.500"| PASS["Xác thực chính chủ thành công<br/>- Vẽ khung XANH<br/>- Hiển thị nhãn xuôi chiều (Un-mirrored)<br/>- Mở khóa nút Vào ca / Tan ca"]
        MATCH -->|"d >= 0.500"| FAIL["Khuôn mặt không khớp<br/>- Vẽ khung ĐỎ<br/>- Khóa nút Vào ca / Tan ca<br/>- Chặn đứng chấm công hộ"]
        
        PASS --> ACTION["Nhân viên bấm Vào ca (Check-in) hoặc Tan ca (Check-out)"]
        ACTION --> CAPTURE["Chụp Snapshot Frame ảnh Base64 đối soát"]
    end

    subgraph BackendGateway ["API Gateway & Order Service"]
        CAPTURE -->|"POST /attendances/check-in hoặc check-out"| GW["API Gateway (Port 3000)"]
        GW -->|"RabbitMQ RPC: attendance_check_in / attendance_check_out"| OS["Order Service (Port 3004)"]
        
        OS --> CHECK_SHIFT{"Truy vấn ca chuẩn (Shift) đang diễn ra"}
        CHECK_SHIFT --> CALC_STATUS["So sánh giờ vào ca với (startTime + gracePeriodMinutes)<br/>-> Trạng thái ON_TIME hoặc LATE"]
        CHECK_SHIFT --> CALC_HOURS["Tan ca: workingHours = (checkOutAt - checkInAt) / 3.6e6"]
        
        CALC_STATUS --> SAVE_ATT[("Lưu bảng attendances trong order_db")]
        CALC_HOURS --> SAVE_ATT
    end
```

### 7.2. Vị trí Lưu trữ Vector Sinh trắc học & Snapshot Đối soát trong `order_db`
- **Vector khuôn mặt 128 chiều (`Employee.faceDescriptor`):**
  - Lưu trữ dưới dạng cột kiểu `jsonb` trong bảng `employees` của `order_db`.
  - Chứa đúng 128 số thực float tương ứng với biểu diễn toán học chuẩn của không gian Euclid từ ResNet-34.
  - Khi ứng dụng POS khởi động hoặc mở Kiosk, danh sách nhân viên cùng vector này được nạp vào bộ nhớ RAM của trình duyệt, cho phép so khớp 1:1 tức thời mà không cần gọi API tính toán lên server.
- **Snapshot ảnh chụp đối soát (`Attendance.checkInPhoto`, `Attendance.checkOutPhoto`):**
  - Chụp tự động ngay tại khoảnh khắc bấm nút Check-in/Check-out với độ phân giải nén vừa phải (Base64 JPEG).
  - Lưu trực tiếp vào cột `text` trong bảng `attendances`, phục vụ quản lý đối chiếu trực quan tại Tab "Bảng chấm công" của `TimesheetModal.tsx`.

### 7.3. Kỹ thuật Hiển thị Un-mirror Canvas trên Video Stream Lật gương
- **Vấn đề quang học:** Khi người dùng nhìn vào màn hình Kiosk chấm công, video camera bắt buộc phải lật gương (`transform: scaleX(-1)`) để hành vi chuyển động giống hệt khi soi gương. Tuy nhiên, nếu vẽ trực tiếp khung nhận diện và chữ (ví dụ: "✅ Xác thực chính chủ (65% khớp)") lên canvas cùng lớp biến đổi này, toàn bộ text sẽ bị lật ngược từ phải sang trái.
- **Giải pháp xử lý:**
  1. Giữ nguyên video element với class `-scale-x-100`.
  2. Canvas vẽ overlay được đặt đè lên video với kích thước pixel 1:1.
  3. Để khung viền và chữ bám sát mặt đã lật mà chữ vẫn đọc xuôi chiều:
     - Tọa độ $X$ của khung nhận diện được đảo ngược theo chiều rộng canvas:
       $$x_{\text{draw}} = \text{canvasWidth} - x_{\text{box}} - \text{width}_{\text{box}}$$
     - Nhãn văn bản (Text Label) được vẽ trực tiếp tại tọa độ $x_{\text{draw}}$ trên ngữ cảnh 2D không bị lật gương. Nhờ đó, khung viền di chuyển chuẩn xác theo cử động người dùng và các dòng trạng thái hiển thị rõ ràng, chuyên nghiệp.

### 7.4. Architectural Decision Record (ADR): Gộp Bảng `employees` và `attendances` vào `order_db`
* **Trạng thái:** ĐÃ PHÊ DUYỆT & TRIỂN KHAI.
* **Bối cảnh:** Cần quyết định nơi lưu trữ các thực thể quản lý nhân viên quầy (`Employee`), ca làm việc (`Shift`) và nhật ký chấm công (`Attendance`). Có 3 phương án được cân nhắc:
  1. *Phương án A:* Tách một service mới độc lập (`hr-service` với `hr_db`).
  2. *Phương án B:* Đưa vào `auth-service` / `auth_db`.
  3. *Phương án C (Được chọn):* Tích hợp vào `order-service` / `order_db` (Cơ sở dữ liệu vận hành quầy).
* **Lý do lựa chọn Phương án C:**
  1. **Tính trọn vẹn của Giao dịch Vận hành quầy (ACID Transactions):**
     - Tại quầy thu ngân, phiên ca làm việc (`pos_shift`), ca làm việc chuẩn (`Shift`), thu ngân lập phiếu (`cashierId`) và các hóa đơn bán hàng/phiếu chi tiền mặt có mối quan hệ phụ thuộc lẫn nhau rất chặt chẽ.
     - Khi xuất báo cáo kết ca (`ShiftSummaryModal`), hệ thống cần tính toán đồng bộ giữa giờ vào ca thực tế của thu ngân trong `attendances`, doanh số bán hàng và các phiếu chi phát sinh. Lưu chung trong `order_db` cho phép thực thi truy vấn SQL gộp tốc độ cao mà không cần đến Distributed Transactions (SAGA / 2PC).
  2. **Độ trễ thấp tối đa cho Kiosk Điểm danh quầy (< 50ms):**
     - Trạm Kiosk POS phục vụ cho toàn bộ nhân sự quầy đổi ca dồn dập vào giờ cao điểm. Việc gom chung vào `order-service` giúp giảm thiểu 1 bước RPC mạng phân tán, đảm bảo thao tác chấm công hoàn tất ngay lập tức.
  3. **Phân định ranh giới trách nhiệm (Bounded Context) rõ ràng:**
     - `auth-service` tập trung 100% vào việc xác thực bảo mật tài khoản hệ thống (User credentials, Bcrypt, JWT Token).
     - `order-service` đảm nhiệm toàn bộ thực thể "Vận hành Vật lý tại cửa hàng" (Physical Store Operations: Bàn ăn, Đơn hàng, Ca kíp, Nhân sự quầy, Chấm công, Quỹ tiền mặt).

### 7.5. Cơ Chế Sinh Mã Nhân Viên Tự Động (Auto-increment Employee Code Architecture)
Nhằm ngăn chặn xung đột trùng lặp mã nhân sự do nhập tay và tối ưu hóa trải nghiệm người dùng:
1. **Thuật toán sinh mã tại Backend (`order-service`):**
   - Phương thức `getNextEmployeeCode(branchId?: string)` truy vấn toàn bộ mã nhân viên có tiền tố `NV%` trong bảng `employees`.
   - Trích xuất phần số thứ tự bằng biểu thức chính quy (`regex /^NV(\d+)$/i`), xác định giá trị số lớn nhất hiện tại ($N_{\max}$).
   - Mã tiếp theo được tự động tính: $N_{\text{next}} = N_{\max} + 1$, và format định dạng chuẩn 2 chữ số: `NV${String(N_next).padStart(2, '0')}` (VD: `NV01`, `NV02`, `NV03` -> `NV04`).
2. **Cơ chế RPC & REST Gateway:**
   - Pattern RabbitMQ RPC: `'get_next_employee_code'`.
   - REST API: `GET /employees/next-code` (phân quyền `ADMIN`, `MANAGER`, `CASHIER`).
3. **Cơ chế bảo vệ & hiển thị trên POS UI (`TimesheetModal.tsx`):**
   - Khi mở modal thêm nhân viên, form tự động gọi API lấy mã tiếp theo và điền sẵn vào ô nhập liệu.
   - Ô nhập mã nhân viên được khóa ở chế độ `readOnly` kèm huy hiệu *"Tự động sinh"* và biểu tượng khóa `<Lock />`, ngăn ngừa lỗi người dùng can thiệp.
   - Có cơ chế Fallback tính toán cục bộ trên RAM nếu tạm thời mất mạng. Sau khi tạo nhân viên thành công, mã được tự động refresh cho lượt tiếp theo.

### 7.6. Kiến Trúc Chấm Công Kiosk Độc Lập Hai Cấp (Dual-Access Kiosk Architecture)
Nhằm phục vụ linh hoạt cho toàn bộ nhân sự đổi ca trong ngày mà không phụ thuộc vào trạng thái đăng nhập của thu ngân:
1. **Cấp 1 - Chấm công Công cộng tại Màn hình Đăng nhập (Unauthenticated Login Kiosk):**
   - Đặt nút bấm nổi bật *"⏰ Chấm công Kiosk (Nhận diện khuôn mặt)"* (viền xanh nét đứt `bg-blue-50/80 text-blue-700 border-2 border-dashed border-blue-300`) ngay bên dưới form đăng nhập tại `LoginScreen.tsx`.
   - Nhân viên ca sáng/chiều có thể điểm danh trước khi thu ngân quầy mở máy và đăng nhập tài khoản.
   - API Gateway mở quyền `@Public()` cho `POST /attendances/check-in`, `POST /attendances/check-out` và `GET /employees`, loại bỏ hoàn toàn rào cản mã lỗi `401 Unauthorized`.
   - Luồng vẫn đảm bảo tính an toàn tuyệt đối nhờ cơ chế xác thực kép: **Client-side AI Face Recognition** (so khớp vector 128D) kết hợp **Mã PIN cá nhân 4 số**.
   - Sau khi hoàn tất (hoặc hủy), modal tự động đóng và bảo lưu nguyên vẹn form đăng nhập ban đầu.
2. **Cấp 2 - Chấm công 1-Chạm trên Thanh Header Thu ngân (Authenticated 1-Touch Header Kiosk):**
   - Đưa nút *"⏰ Chấm công Kiosk"* (viền xanh tinh tế, nền gradient `from-blue-50 to-sky-50 text-blue-800 border-blue-300`) trực tiếp ra thanh Top Header tại `Header.tsx` (nằm ở cụm điều khiển bên phải cạnh trạng thái mạng, chuông thông báo và đăng xuất).
   - Cho phép nhân viên đổi ca giữa ngày bấm 1 chạm bật ngay camera điểm danh mà không cần mở menu Drawer.

---

## 8. Kiến Trúc Kiểm Soát Phân Quyền & Xử Lý Ngoại Lệ RBAC RolesGuard

Hệ thống bảo vệ tài nguyên API bằng mô hình Role-Based Access Control (RBAC) chặt chẽ tại tầng API Gateway:

```mermaid
flowchart TD
    REQ["Incoming HTTP Request"] --> JWT_GUARD["JwtAuthGuard (Passport-JWT)"]
    JWT_GUARD --> IS_PUB{"Endpoint có decorator @Public()?"}
    IS_PUB -->|"Có"| PASS_REQ["Bỏ qua xác thực JWT & Cho phép Request"]
    IS_PUB -->|"Không"| VERIFY_TOKEN["Xác thực JWT Token trong Header"]
    VERIFY_TOKEN --> EXTRACT_USER["Trích xuất payload vào request.user"]
    
    EXTRACT_USER --> ROLES_GUARD["RolesGuard (canActivate)"]
    ROLES_GUARD --> CHECK_META{"Endpoint có khai báo @Roles()?"}
    CHECK_META -->|"Không"| ALLOW["Cho phép truy cập"]
    CHECK_META -->|"Có"| CHECK_USER{"request.user & role có tồn tại?"}
    
    CHECK_USER -->|"Không"| ERR_NO_ROLE["throw ForbiddenException('No role found')"]
    CHECK_USER -->|"Có"| MATCH_ROLE{"user.role có nằm trong requiredRoles?"}
    
    MATCH_ROLE -->|"Có"| ALLOW
    MATCH_ROLE -->|"Không"| ERR_FORBIDDEN["throw ForbiddenException('User does not have the required role')"]
```

### Nguyên Lý Thiết Kế Xử Lý Ngoại Lệ (Exception Handling Pattern)
- Trong các phiên bản NestJS tiêu chuẩn, việc trả về `return false` bên trong phương thức `canActivate` có thể khiến framework xử lý theo cơ chế mặc định mà không ném đúng ngoại lệ chuẩn `ForbiddenException` khi chạy trong ngữ cảnh kiểm thử độc lập (Jest Isolation Context).
- Do đó, `RolesGuard` được thiết kế chủ động ném ngoại lệ tường minh:
  ```typescript
  if (!user || !user.role) {
    throw new ForbiddenException('No role found');
  }
  const hasRole = requiredRoles.includes(user.role);
  if (!hasRole) {
    throw new ForbiddenException('User does not have the required role');
  }
  return true;
  ```
- Giải pháp này vừa đảm bảo tính an toàn nghiêm ngặt cho API Gateway trong môi trường thực tế, vừa giúp bộ kiểm thử đơn vị (`roles.guard.spec.ts`) đạt tỷ lệ Pass 100% (10/10 test case).

---

## 9. Hệ Thống Thiết Kế & Chuẩn Hóa Bảng Màu CukCuk POS (Design System)

Nhằm tối ưu hóa công thái học thị giác (visual ergonomics) và giảm thiểu căng thẳng cho nhân viên vận hành trong ca làm việc dài, toàn bộ giao diện `frontend/pos-web` được quy chuẩn đồng nhất theo tông màu **Xanh dương CukCuk & Trắng sáng**:

| Token Màu Sắc | Mã Màu HEX / Tailwind CSS | Mục Đích Sử Dụng trong Giao Diện |
| :--- | :--- | :--- |
| **Primary Brand** | `#0070ba` / `blue-600` (`#2563eb`) | Nút hành động chính (Thanh toán, Xác nhận, Đơn tạm tính Active, Tab Đang chọn). |
| **Primary Dark / Hover** | `blue-700` (`#1d4ed8`) | Trạng thái hover/active của các nút hành động, gradient nền của Header Drawer. |
| **Primary Light / Soft** | `blue-50` (`#eff6ff`) / `sky-50` | Nền các badge trạng thái, thẻ được chọn, viền nhạt `border-blue-200`. |
| **Drawer Header Gradient**| `from-blue-600 via-blue-700 to-sky-600` | Header của Side Menu Drawer (Profile & Session card ca trực). |
| **Neutral Background** | `bg-white` & `bg-zinc-50` / `bg-slate-50` | Nền trang tổng thể, nền thẻ món, nền modal popup. |
| **Neutral Border** | `border-zinc-200` / `border-slate-200` | Đường phân cách danh mục, viền ô nhập liệu, đường chia giỏ hàng. |
| **Text Primary & Muted** | `text-zinc-900` / `text-zinc-500` | Chữ tiêu đề đậm và chữ phụ chú rõ ràng, tương phản cao trên nền trắng. |

---

## 10. Kiến Trúc Gom Traffic Single-Domain & Triển Khai Phân Tán (Single-Domain Proxy & Distributed Deployment)

Nhằm phục vụ mô hình triển khai phân tán (Frontend trên Vercel Edge CDN, Backend & Databases trên VPS hoặc máy phát triển kết nối qua ngrok), hệ thống áp dụng cơ chế Gom Traffic toàn diện:

```mermaid
graph TD
    Client["Client Browser (Vercel SPA: pos-web)"]
    Gateway["API Gateway (Port 3000)<br/>Single Entry Point"]
    OrderSvc["Order Service (Port 3004)"]
    AuthSvc["Auth Service"]
    InvenSvc["Inventory Service"]

    Client -->|"HTTP REST API (GET, POST, PUT, DELETE)"| Gateway
    Client -->|"WebSocket Handshake & Upgrade (/socket.io)"| Gateway

    Gateway -->|"TCP RPC via RabbitMQ"| AuthSvc
    Gateway -->|"TCP RPC via RabbitMQ"| OrderSvc
    Gateway -->|"TCP RPC via RabbitMQ"| InvenSvc

    Gateway -.->|"HTTP Long-Polling & WebSocket Upgrade Proxy (/socket.io)"| OrderSvc
```

### 10.1. Cơ Chế Reverse Proxy WebSocket tại API Gateway
- **Single-Port Architecture:** Thay vì buộc Frontend phải mở 2 kết nối tới 2 domain hoặc 2 port khác nhau (`:3000` cho REST và `:3004` cho Socket), API Gateway tích hợp `http-proxy-middleware` để tiếp nhận toàn bộ request tại đường dẫn `/socket.io`.
- **Hỗ trợ HTTP Upgrade:** Khi client khởi tạo bắt tay nâng cấp lên WebSocket protocol (`Connection: Upgrade`, `Upgrade: websocket`), máy chủ HTTP của Gateway (`server.on('upgrade', ...)`) lập tức ủy thác socket kết nối sang `order-service:3004`.
- **Lợi ích ngrok Free:** Người dùng chỉ cần mở 1 tunnel duy nhất (`ngrok http 3000`), không cần tài khoản trả phí hay mở nhiều domain.
- **Client Auto-Fallback:** Phía Frontend `pos-web` tự động dùng chung `VITE_API_GATEWAY_URL` khi `VITE_SOCKET_URL` không được cấu hình riêng biệt.

### 10.2. Kiến Trúc Mock & Fallback (Decoupled Readiness)
Để đảm bảo các chức năng bán hàng POS không bị gián đoạn khi các service vệ tinh (`product-service`, `branch-service`) chưa triển khai độc lập:
1. **Product Controller Mock tại Gateway:** Xử lý trực tiếp các tuyến đường `@Public() /products`, `/products/categories`, `/products/toppings`, trả về danh mục và món ăn demo đầy đủ.
2. **Branch Controller Mock & Default Branch:** Tuyến đường `@Public() /branches` trả về Chi nhánh 1 mặc định; `JwtAuthGuard` và `AuthService` tự động gán fallback `branchId = "1"` cho người dùng chưa có chi nhánh cụ thể.
3. **CORS Mở Rộng:** Whitelist tự động cho phép `*.vercel.app`, `*.ngrok-free.app`, `*.ngrok.io` cùng danh sách `FRONTEND_URL` tùy chỉnh.

### 10.3. Cơ Chế Tự Động Chốt Ca Điểm Danh (Auto-close Stale Session)
- Khi nhân viên quên hoàn tất tan ca (Check-out) ở ngày hôm trước, `AttendanceService.checkIn()` tự động phát hiện phiên làm việc cũ (>16 giờ hoặc khác ngày), chốt giờ ra mặc định và cho phép nhân viên vào ca mới bình thường của ngày hôm nay.
- Bộ lọc `RpcExceptionFilter` tại API Gateway bắt toàn bộ exception từ microservice qua RabbitMQ, ném về mã lỗi HTTP chuẩn (400, 404) cùng thông báo tiếng Việt chi tiết lên giao diện người dùng.

