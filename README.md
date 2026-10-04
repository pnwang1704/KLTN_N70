# Hệ thống POS & KDS Bán Hàng F&B (Khóa Luận Tốt Nghiệp)

Dự án Hệ thống Quản lý Vận hành Bán hàng F&B (Food & Beverage) hiện đại, tích hợp KDS (Kitchen Display System), QR Order tại bàn, POS (Point of Sale), Quản lý Ca làm việc động và Chấm công Sinh trắc học bằng Trí tuệ Nhân tạo (Client-side AI Face Recognition). Hệ thống được xây dựng theo kiến trúc Microservices với Node.js (NestJS), React 19 (Vite), PostgreSQL, RabbitMQ, Socket.IO, và được đóng gói hoàn toàn bằng Docker Compose.

---

## 🚀 Tính năng nổi bật & Lộ trình thực hiện (Features Roadmap)

- [x] **Customer QR Web (Mobile-First):** Quét mã QR tại bàn tự động nhận diện bàn qua URL (`?branchId=1&tableId=5`), fallback giao diện sang trọng; mô hình **Thanh toán sau tại quầy (Post-pay)**; hỗ trợ gọi nhiều đợt trong bữa ăn và tra cứu "Món đã gọi tại bàn" (Active order drawer).
- [x] **KDS Web:** Màn hình hiển thị bếp Realtime (đồng bộ Socket.IO sự kiện `NEW_ORDER_CREATED` và `ITEM_READY`).
- [x] **POS Web (Thu ngân quầy):**
  - **Chuẩn hóa Bảng màu POS:** Chuyển đổi 100% giao diện sang tông Xanh dương chuyên nghiệp (`#0070ba`, `blue-600`, `sky-600`) & Trắng sáng (`bg-white`, `bg-zinc-50`), sạch 100% class `orange-` và `amber-`, tối ưu công thái học thị giác.
  - Quản lý sơ đồ bàn (đang phục vụ màu xanh dương / bàn trống màu trắng xám).
  - Chiết khấu linh hoạt (% và VNĐ) tại chân giỏ hàng.
  - Thanh toán bàn gộp các đợt gọi thành 1 hóa đơn và in hóa đơn nhiệt 80mm.
  - Quản lý quỹ tiền mặt (Cash In / Cash Out qua phiếu chi khẩn cấp), đối soát kết ca 3 chiều (`ShiftSummaryModal`).
- [x] **Lưu & Quản lý Hóa đơn Tạm tính (Hold / Draft Orders):**
  - Nút **`[ 💾 Lưu tạm ]`** tại chân giỏ hàng `OrderPanel.tsx` (tự vô hiệu hóa khi giỏ rỗng).
  - Cơ chế tự sinh mã `#TAM-01`, `#TAM-02`... tăng dần theo ngày, lưu trữ snapshot toàn vẹn vào `localStorage` (`pos_held_orders`), giải phóng giỏ hàng tức thời.
  - Badge **`[ 📄 Đơn tạm tính (N) ]`** trên Top Header hiển thị số lượng đơn chờ kèm hiệu ứng `animate-pulse` khi $N > 0$.
  - Slide-over Drawer `HeldOrdersDrawer.tsx` trượt từ cạnh phải (`w-96`, backdrop mờ, phím ESC đóng): Xem chi tiết món, giá in đậm màu xanh, nút "Phục hồi đơn", "Xóa đơn" và "Hủy tất cả đơn tạm".
  - Cơ chế bảo vệ giỏ hàng chống ghi đè (Safe Cart Overwrite Protection) với modal xác nhận trước khi khôi phục đơn.
- [x] **Phân hệ Quản lý Ca làm việc (Shift Management):**
  - Entity `Shift` lưu trữ khung giờ ca chuẩn linh hoạt (`code`, `name`, `startTime`, `endTime`, `gracePeriodMinutes`, `isActive`).
  - Cơ chế nạp ca làm việc động từ backend, tự động gợi ý ca làm việc thông minh theo đồng hồ hệ thống (0h - 23h59).
  - Cơ chế dự phòng (Offline Fallback) tự sinh ca cục bộ tại trạm POS khi mất kết nối mạng.
  - Phân quyền kiểm soát RBAC (`ADMIN`, `MANAGER`, `CASHIER`).
- [x] **Phân hệ Quản lý Nhân sự & Chấm công Sinh trắc học AI (Employee & Attendance Module):**
  - Entity `Employee`: Quản lý hồ sơ nhân sự quầy (`employeeCode`, `fullName`, `role`, `pinCode`, vector khuôn mặt 128 chiều `faceDescriptor` JSONB).
  - Entity `Attendance`: Ghi nhận nhật ký chấm công (`checkInAt`, `checkInPhoto`, `checkOutAt`, `checkOutPhoto`, số giờ thực tế `workingHours`, trạng thái `ON_TIME` hoặc `LATE` theo thời gian ân hạn `gracePeriodMinutes`).
  - **Tự động sinh mã nhân viên (Auto-increment Employee Code):** Backend `services/order-service` tự động truy vấn tìm mã lớn nhất và sinh mã tăng dần chuẩn định dạng `NVxx` (`NV01`, `NV02`, `NV03`, `NV04`...), cung cấp qua endpoint `GET /employees/next-code` và khóa `readOnly` trên form tạo mới để tránh trùng lặp.
  - **AI Thị giác máy tính Client-side (`@vladmandic/face-api`):** Trích xuất vector đặc trưng 128 chiều (SSD MobileNet V1, 68 landmarks, Face Recognition 128D) trực tiếp trên trình duyệt, so khớp khoảng cách Euclid 1:1 ($d < 0.500$) loại bỏ 100% tình trạng chấm công hộ (buddy punching).
  - **Chấm công Kiosk độc lập ngay từ Màn hình Đăng nhập (Login Kiosk Flow):** Bổ sung nút nổi bật *"⏰ Chấm công Kiosk (Nhận diện khuôn mặt)"* (viền xanh nét đứt `bg-blue-50/80 text-blue-700 border-blue-300`) ngay dưới form đăng nhập tại `LoginScreen.tsx`. API Gateway gắn `@Public()` cho `POST /attendances/check-in`, `check-out` và `GET /employees` (mặc định `branchId = '1'`), cho phép nhân viên toàn quầy điểm danh trước khi thu ngân đăng nhập vào ca.
  - **Kiosk 1-chạm trên Header bán hàng:** Bố trí nút *"⏰ Chấm công Kiosk"* (viền xanh, nền gradient sky-blue) trực tiếp cạnh thông tin Thu ngân & đồng hồ ca làm việc, hỗ trợ thao tác nhanh khi giao nhận ca mà không cần mở menu.
  - **Giải pháp Un-mirror Text trên Video Canvas:** Giữ video soi gương tự nhiên (`scaleX(-1)`) nhưng nghịch đảo tọa độ bounding box và label tag trên Canvas để chữ hiển thị chuẩn từ trái sang phải, không bị lật chữ.
- [x] **Hợp nhất Trung tâm Quản trị Nhân sự (`TimesheetModal.tsx`):**
  - **Tab 1: 🕒 Bảng chấm công (Timesheet):** Tra cứu lịch sử vào/tan ca theo ngày/tháng/nhân viên kèm ảnh snapshot đối soát trực quan.
  - **Tab 2: 👥 Hồ sơ Nhân viên & Sinh trắc học (Face Enrollment):** Quản lý danh sách nhân sự, mã nhân viên tự động sinh kèm badge "Tự động sinh", chụp webcam trực tiếp hoặc tải ảnh chân dung để trích xuất và lưu vector khuôn mặt mẫu 128D.
  - **Tab 3: 🔐 Tài khoản hệ thống (Users & Roles):** Hiển thị danh sách tài khoản đăng nhập POS/Admin với "TÊN HIỂN THỊ" chuẩn hóa, form tạo tài khoản với "Tên hiển thị *", "Tên đăng nhập *", "Phân quyền", "Chi nhánh", và thao tác khóa/mở khóa.
- [x] **Kiến trúc Header Siêu Tinh Gọn & Side Menu Drawer:**
  - **Top Header:** Loại bỏ logo "N70 POS", đưa nút menu ☰, tab "Bán hàng" và nút Badge "Đơn tạm tính" lên đầu góc trái; chuyển thông tin chi nhánh, tài khoản và ca trực vào Side Drawer. Góc phải giữ: Nút Kiosk 1-chạm, Trạng thái mạng, Chuông thông báo và Đăng xuất.
  - **Side Menu Drawer:** Trượt mượt mà từ mép trái (`w-80`, backdrop mờ): Header nổi bật với gradient xanh CukCuk `from-blue-600 via-blue-700 to-sky-600`, avatar tròn, tên hiển thị, chi nhánh, badge ca trực nhấp đổi ca; thân Drawer phân nhóm nghiệp vụ rõ ràng dạng Flex-row 1 dòng, loại bỏ text mô tả phụ gây nhiễu.
  - **Phiếu Chi Tiền Mặt (`ExpenseModal.tsx`):** Loại bỏ toàn bộ placeholder gợi ý ở ô Lý do chi và Người nhận/ghi chú, tự động làm sạch form mỗi khi mở.
- [x] **Kiểm thử Tự động & Bảo mật RBAC (Unit Testing):**
  - Tinh chỉnh `RolesGuard` trong `api-gateway` ném `ForbiddenException('No role found')` chuẩn NestJS khi request thiếu user hoặc role.
  - 100% các bộ kiểm thử Jest (`roles.guard.spec.ts`, `inventory.service.spec.ts`) vượt qua kiểm tra nghiêm ngặt.
- [x] **Thanh toán Đa phương thức:** Tiền mặt (tính tiền thối nhanh) và PayOS VietQR động (Webhook & Polling xác nhận tiền vào tài khoản tự động).
- [x] **Giải phóng bàn Real-time:** Socket.IO sự kiện `table:completed` đồng bộ hai chiều giữa POS và Customer Web ngay khi thanh toán xong.
- [x] **Trừ kho tự động theo công thức (SAGA Pattern):** Lắng nghe sự kiện `order_completed` qua RabbitMQ, trừ nguyên vật liệu bằng TypeORM Transaction, tự động rollback nếu thiếu hàng.
- [x] **Persistent Storage & Microservices:** Named Persistent Volumes cho 6 database PostgreSQL và RabbitMQ, đảm bảo dữ liệu luôn bền vững khi restart/rebuild container.

---

## 💻 Công nghệ Sử dụng (Tech Stack & Libraries)

### Frontend Applications (`pos-web`, `customer-web`, `kds-web`)
* **Core:** React 19, TypeScript, Vite
* **Styling:** Tailwind CSS v4, Tailwind Merge, CLSX
* **Icons:** Lucide React
* **AI & Computer Vision:** `@vladmandic/face-api` (^1.7.15) — Client-side Face Detection (SSD MobileNet V1), Face Landmarks (68 points), Face Recognition (128D embeddings vector), tính khoảng cách Euclid (Euclidean Distance).
* **Networking & Realtime:** Axios, Socket.IO Client (^4.8.3)
* **Web Server:** Nginx Alpine (Multi-stage Docker builds)

### Backend Microservices & API Gateway
* **Framework:** NestJS (TypeScript), TypeORM
* **Databases:** PostgreSQL (Database-per-Service: `auth_db`, `product_db`, `order_db`, `inventory_db`, `branch_db`, `reporting_db`)
* **Message Broker:** RabbitMQ (RPC Request-Response patterns & Asynchronous Pub/Sub events)
* **Realtime Server:** Socket.IO Server (Cổng 3004, phân tách Room theo từng `branchId`)
* **Security & Auth:** Stateless JWT, Passport-JWT, Bcrypt, RBAC Guards (`RolesGuard`)
* **Payment Integration:** PayOS API SDK (VietQR động chuẩn Napas 247)
* **DevOps & Containerization:** Docker, Docker Compose với Named Persistent Volumes

---

## 🏗 Bảng Tổng hợp Hạ tầng (Infrastructure & Ports)

Toàn bộ hệ thống chạy ngầm trong một mạng nội bộ (`app-network`). Dưới đây là danh sách các Port được mở ra môi trường Host (máy thật):

| Thành phần | Công nghệ | Container Name | Port ngoài (Host) | Port trong | Named Persistent Volume |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RabbitMQ Management** | RabbitMQ | `fnb_rabbitmq` | `15672` (UI), `5672` | 15672, 5672 | `rabbitmq_data` |
| **API Gateway** | NestJS | `fnb_api_gateway` | **`3000`** | 3000 | - |
| **Order Service (Socket)** | NestJS | `fnb_order_service` | **`3004`** | 3004 | - |
| **Auth Database** | PostgreSQL | `fnb_postgres_auth` | `5432` | 5432 | `postgres_auth_data` |
| **Product Database** | PostgreSQL | `fnb_postgres_product`| `5434` | 5432 | `postgres_product_data` |
| **Order Database** | PostgreSQL | `fnb_postgres_order` | `5435` | 5432 | `postgres_order_data` |
| **Inventory Database** | PostgreSQL| `fnb_postgres_inventory`| `5436` | 5432 | `postgres_inventory_data` |
| **Branch DB** *(Pending)* | PostgreSQL | `fnb_postgres_branch` | `5437` | 5432 | `postgres_branch_data` |
| **Reporting DB** *(Pending)*| PostgreSQL | `fnb_postgres_reporting`| `5438` | 5432 | `postgres_reporting_data` |
| **KDS Web** | React + Nginx | `fnb_kds_web` | **`5173`** | 80 | - |
| **Customer QR Web** | React + Nginx | `fnb_customer_web` | **`5174`** | 80 | - |
| **POS Web** | React + Nginx | `fnb_pos_web` | **`5175`** | 80 | - |

---

## 🛠 Hướng dẫn Khởi chạy (Getting Started)

### 1. Chuẩn bị Thư viện Mô hình AI (`models/`)
Hệ thống sử dụng mô hình AI chạy trực tiếp tại trình duyệt POS (`@vladmandic/face-api`). Bộ weights mô hình đã được đặt sẵn trong thư mục:
```text
frontend/pos-web/public/models/
├── ssd_mobilenetv1_model-weights_manifest.json & .bin (Mô hình phát hiện khuôn mặt)
├── face_landmark_68_model-weights_manifest.json & .bin (Mô hình nhận diện 68 điểm mốc)
├── face_recognition_model-weights_manifest.json & .bin (Mô hình trích xuất vector 128 chiều)
└── tiny_face_detector_model-weights_manifest.json & .bin
```
*(Thư mục này được mount trực tiếp hoặc copy vào static assets của Nginx khi build Docker container).*

### 2. Khởi chạy bằng Docker Compose (Khuyên dùng)
Bạn không cần cài đặt Node.js hay cấu hình Database thủ công. Chỉ cần chạy duy nhất lệnh sau tại thư mục gốc:

```bash
docker compose up --build -d
```

*(Quá trình này có thể mất 1-3 phút để biên dịch toàn bộ Microservices và Frontend. Hệ thống có cơ chế **Healthcheck** tự động chờ Database & RabbitMQ lên sóng mới khởi động Backend).*

### 3. Cấu hình Biến Môi Trường (Tùy chọn)
Để luồng thanh toán tự động qua PayOS hoạt động, bạn có thể bổ sung 3 biến môi trường vào file `.env` tại thư mục gốc hoặc API Gateway:
```env
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key
```

---

## 🔑 Thông tin Tài khoản & Dữ liệu Thử nghiệm

### 1. Tài khoản Đăng nhập Hệ thống (Login Accounts)
| Tên đăng nhập | Mật khẩu | Tên hiển thị | Vai trò (Role) | Ứng dụng truy cập |
| :--- | :--- | :--- | :--- | :--- |
| `admin` | `admin123` | Quản trị viên hệ thống | `ADMIN` | POS Web (`:5175`), KDS Web (`:5173`) |
| `thungancn1` | `123456` | Thu ngân Quầy 1 | `CASHIER` | POS Web (`:5175`) |

### 2. Dữ liệu Nhân sự & Kiosk Chấm công Sinh trắc học (Mẫu Seed Sẵn)
Toàn bộ nhân sự tại quầy dùng chung Kiosk chấm công tại máy POS:
| Mã NV | Họ và tên | Chức vụ | Mã PIN khẩn cấp | Sinh trắc học Face ID |
| :--- | :--- | :--- | :--- | :--- |
| **`NV01`** | Nguyễn Văn An | Thu ngân quầy 1 (`CASHIER`) | `1234` | Sẵn sàng đăng ký qua Webcam |
| **`NV02`** | Trần Thị Bình | Pha chế (`BARISTA`) | `1234` | Sẵn sàng đăng ký qua Webcam |
| **`NV03`** | Lê Hoàng Long | Phục vụ bàn (`WAITER`) | `1234` | Sẵn sàng đăng ký qua Webcam |

> [!TIP]
> **Thao tác thử nghiệm chấm công sinh trắc học AI:**
> 1. **Cách 1 - Chấm công trực tiếp từ Màn hình Đăng nhập (Không cần login):**
>    - Truy cập POS Web (`http://localhost:5175`).
>    - Nhấp nút viền xanh nét đứt **"⏰ Chấm công Kiosk (Nhận diện khuôn mặt)"** bên dưới form đăng nhập.
>    - Kiosk mở camera nhận diện: Chọn nhân viên `NV01`, nhìn vào camera để xác thực khuôn mặt (hoặc nhập PIN `1234`), bấm **"Vào ca"** / **"Tan ca"**. Modal tự động lưu ảnh snapshot và đóng lại, quay về form login.
> 2. **Cách 2 - Chấm công 1-chạm từ màn hình Thu ngân bán hàng:**
>    - Đăng nhập POS (`admin` hoặc `thungancn1`).
>    - Nhấp nút **"⏰ Chấm công Kiosk"** trực tiếp trên thanh Top Header hoặc mở từ Side Menu Drawer (☰).
> 3. **Đăng ký khuôn mặt mới:**
>    - Bấm nút Menu (☰) ở góc trái Header -> "Quản lý Nhân sự & Bảng Công" -> Chọn Tab **"👥 Hồ sơ Nhân viên & Sinh trắc học"**.
>    - Khi bấm "Thêm nhân viên", hệ thống tự động sinh mã `NV04` (khóa read-only).
>    - Bấm nút **"Đăng ký mặt"** cho nhân viên, mở camera chụp khuôn mặt để hệ thống trích xuất vector 128 chiều và lưu trữ.

---

## 🧪 Hướng dẫn Test Luồng E2E

Sau khi các Container `Started`, mở 3 tab trình duyệt để mô phỏng thực tế:

1. **Khách hàng quét mã QR tại bàn (Customer Web):** `http://localhost:5174/?branchId=1&tableId=5`
   - Hệ thống tự động nhận diện Bàn 5 và chuyển thẳng vào màn hình Menu chọn món.
   - Chọn món, chọn Size/Topping/Ghi chú -> Bấm "Gửi đơn gọi món" (Đợt 1).
   - Tiếp tục chọn thêm món và gửi tiếp Đợt 2.
   - Bấm icon "Món đã gọi" trên Header: Drawer hiển thị gộp đầy đủ các món qua 2 đợt gọi và tổng tiền bàn.
2. **Nhà Bếp tiếp nhận chế biến (KDS):** `http://localhost:5173`
   - Đăng nhập bếp. Các đợt gọi món vừa gửi sẽ **lập tức nảy lên (Realtime)** trên màn hình KDS kèm chuông báo.
   - Bếp bấm "Bắt đầu làm" -> "Hoàn thành" từng món (POS sẽ nhận được Toast thông báo `ITEM_READY`).
3. **Thu ngân thao tác và thanh toán tại quầy (POS):** `http://localhost:5175`
   - Đăng nhập `thungancn1` (mật khẩu: `123456`). Modal chọn ca hiển thị gợi ý thông minh ca đang diễn ra (`Ca 1: 06:00 - 14:00` hoặc `Ca 2: 14:00 - 22:00`), nhập số tiền nhận bàn giao đầu ca.
   - Chuyển sang Tab "Sơ đồ bàn", Bàn 5 đổi sang màu xanh dương (Đang phục vụ).
   - Nhấp vào Bàn 5: Hiển thị đầy đủ danh sách món gộp từ các đợt gọi.
   - Nhập chiết khấu (nếu có) -> Bấm "Thanh toán bàn này".
   - Chọn Tiền mặt (nhập tiền khách đưa / chọn mệnh giá nhanh) hoặc Chuyển khoản VietQR PayOS -> Bấm "Xác nhận".
   - Hóa đơn nhiệt (80mm) hiển thị trọn vẹn toàn bộ món của tất cả đợt gọi để in.
   - **Realtime Sync:** Bàn 5 trên POS chuyển về màu xám nhạt (Trống); điện thoại khách hàng tự động đóng modal và giải phóng bàn ăn.
   - Chuyển sang Tab "Quản lý Kho", số lượng nguyên liệu tự động bị trừ ngầm qua hệ thống RabbitMQ (Transactional SAGA).
   - Khi hết ca, bấm Menu tiện ích -> "Báo cáo kết ca" (`ShiftSummaryModal`) để kiểm kê tiền két 3 chiều và in phiếu bàn giao kết ca 80mm.
4. **Thử nghiệm Lưu & Phục hồi Hóa đơn tạm tính (Hold Orders):**
   - Tại Tab "Bán hàng", chọn một vài món vào giỏ hàng (kèm Size, Topping, Chiết khấu).
   - Bấm nút **[💾 Lưu tạm]** ở đáy giỏ hàng: Giỏ hàng được làm sạch tức thì, hệ thống tự sinh mã `#TAM-01`, lưu vào `localStorage.pos_held_orders`, và badge **[📄 Đơn tạm tính (1)]** trên Header nhấp nháy xanh `animate-pulse`.
   - Thu ngân có thể phục vụ bán hàng cho khách tiếp theo bình thường.
   - Nhấp vào badge **[📄 Đơn tạm tính (1)]** trên Top Header hoặc chọn "Hóa đơn tạm tính" từ Side Menu Drawer để mở Drawer từ cạnh phải.
   - Bấm **[↩ Phục hồi đơn]**: Toàn bộ món, chiết khấu và tổng tiền được tải lại trọn vẹn vào giỏ; nếu giỏ đang có món, hệ thống hiển thị modal cảnh báo xác nhận ghi đè an toàn.

---

## ⚙️ Hướng dẫn cho Developer

Hệ thống sử dụng cơ chế Multi-stage build cho Docker. 
Khi chạy hoặc phát triển độc lập từng service:
```bash
# Cài đặt dependencies cho từng module
npm install --prefix services/order-service
npm install --prefix api-gateway
npm install --prefix frontend/pos-web

# Build kiểm tra mã nguồn
npm run build --prefix services/order-service
npm run build --prefix api-gateway
npm run build --prefix frontend/pos-web
```

---

## 📚 Tài liệu Kỹ thuật Chi tiết

Vui lòng tham khảo thư mục `docs/` để biết thêm chi tiết về kiến trúc:
- [Kiến trúc Hệ thống (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md)
- [Tài liệu API (docs/API_DOCUMENTATION.md)](docs/API_DOCUMENTATION.md)
- [Luồng Hoạt động E2E (docs/E2E_WORKFLOWS.md)](docs/E2E_WORKFLOWS.md)
- [Yêu cầu Dự án & Traceability Matrix (docs/PROJECT_REQUIREMENTS.md)](docs/PROJECT_REQUIREMENTS.md)
- [Biểu đồ Lớp Thực thể (docs/CLASS_DIAGRAMS.md)](docs/CLASS_DIAGRAMS.md)
