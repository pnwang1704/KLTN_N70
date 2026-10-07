# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG PHÂN TÁN (DEPLOYMENT GUIDE)

Tài liệu này hướng dẫn chi tiết quy trình chuẩn bị, cấu hình và vận hành hệ thống POS N70 theo kiến trúc phân tán:
- **Backend & Database:** Đóng gói Docker đa tầng và vận hành qua Docker Compose trên Máy chủ ảo (VPS Ubuntu/Debian) hoặc máy local kết nối ngrok.
- **Frontend (`pos-web`):** Triển khai dưới dạng Single Page Application (SPA) tối ưu trên nền tảng Vercel Edge Network.
- **Reverse Proxy WebSocket Single-Domain:** Gom toàn bộ luồng REST API và WebSocket / Socket.IO qua duy nhất một cổng API Gateway (port 3000), tối ưu cho triển khai qua tên miền duy nhất hoặc ngrok free.

---

## 1. TỔNG QUAN KIẾN TRÚC TRIỂN KHAI

```mermaid
graph TD
    Client["Client / Thu ngân (Trình duyệt / Thiết bị POS)"]
    Vercel["Frontend (pos-web) - Vercel Edge CDN"]
    Host["VPS Host (Linux) / Local ngrok Tunnel"]
    
    subgraph Docker_Network ["Docker Internal Network (pos-network / app-network)"]
        Gateway["api-gateway :3000<br/>(REST API + WebSocket Reverse Proxy /socket.io)"]
        AuthSvc["auth-service (TCP Microservice)"]
        OrderSvc["order-service :3004<br/>(Socket.IO Realtime + Microservice)"]
        InvenSvc["inventory-service (TCP Microservice)"]
        Postgres["PostgreSQL :5432<br/>(auth_db, order_db, inventory_db)"]
        RabbitMQ["RabbitMQ :5672 / :15672"]
    end

    Client -->|HTTPS| Vercel
    Client -->|REST API & WebSocket /socket.io<br/>(Port 3000 / Single Domain)| Gateway

    Gateway -->|TCP Microservice| AuthSvc
    Gateway -->|TCP Microservice| OrderSvc
    Gateway -->|TCP Microservice| InvenSvc
    Gateway -->|WebSocket Proxy /socket.io| OrderSvc

    AuthSvc -->|SQL Connection| Postgres
    OrderSvc -->|SQL Connection| Postgres
    InvenSvc -->|SQL Connection| Postgres

    OrderSvc -->|AMQP Events| RabbitMQ
    InvenSvc -->|AMQP Events| RabbitMQ
```

---

## 2. TRIỂN KHAI BACKEND VÀ DATABASE TRÊN VPS

### 2.1. Yêu cầu tiên quyết trên VPS
- Hệ điều hành: Ubuntu 22.04 LTS / 24.04 LTS (khuyến nghị tối thiểu 2GB - 4GB RAM).
- Đã cài đặt Docker Engine & Docker Compose (v2.x trở lên).
  ```bash
  # Cài đặt Docker nhanh trên Ubuntu
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  ```
- Mở các port tường lửa (UFW / Security Group):
  - Port `22` (SSH)
  - Port `3000` (API Gateway - Duy nhất tiếp nhận toàn bộ REST API và WebSocket)
  - Port `15672` (RabbitMQ Management Dashboard - tùy chọn bảo mật)

---

### 2.2. Các bước triển khai

#### Bước 1: Kéo mã nguồn về VPS
```bash
git clone https://github.com/pnwang1704/KLTN_N70.git
cd KLTN_N70
git checkout nhatquang # hoặc nhánh production tương ứng
```

#### Bước 2: Thiết lập Biến môi trường Production
Tạo file `.env.production` từ file mẫu `.env.production.example`:
```bash
cp .env.production.example .env.production
nano .env.production
```
*Lưu ý thay đổi các thông số bảo mật:*
- `POSTGRES_PASSWORD`: Mật khẩu cơ sở dữ liệu mạnh.
- `RABBITMQ_DEFAULT_PASS`: Mật khẩu RabbitMQ mạnh.
- `JWT_SECRET`: Chuỗi khóa ký JWT bảo mật cao (phải đồng bộ giữa API Gateway và Auth Service).
- `FRONTEND_URL`: Tên miền frontend triển khai trên Vercel (ví dụ: `https://n70-pos.vercel.app`).

#### Bước 3: Cấp quyền thực thi cho script khởi tạo database
```bash
chmod +x scripts/init-multiple-dbs.sh
```

#### Bước 4: Khởi chạy hệ thống bằng Docker Compose
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

#### Bước 5: Kiểm tra trạng thái hoạt động
```bash
# Xem danh sách các container đang chạy
docker compose -f docker-compose.prod.yml ps

# Xem log khởi động của API Gateway
docker compose -f docker-compose.prod.yml logs -f api-gateway

# Kiểm tra log database
docker compose -f docker-compose.prod.yml logs -f postgres
```

---

## 3. TRIỂN KHAI THỬ NGHIỆM QUA NGROK & CẤU HÌNH PAYOS WEBHOOK

Khi chạy Backend cục bộ và deploy Frontend lên Vercel:
Nhờ cơ chế Reverse Proxy tích hợp sẵn tại API Gateway, bạn **chỉ cần mở 1 tunnel duy nhất tới cổng 3000**:

```bash
ngrok http 3000
```

Ngrok sẽ cấp một domain công khai dạng: `https://abcdef-123.ngrok-free.app`.
Cả REST API và kết nối WebSocket `/socket.io` đều tự động chạy qua URL này mà không cần mở thêm port 3004.

### 3.1. Cấu hình Webhook PayOS trên Kênh Quản trị PayOS
1. Đăng nhập vào [Kênh quản lý PayOS](https://my.payos.vn/).
2. Chọn **Cấu hình thanh toán** -> **Webhook URL**.
3. Dán đường dẫn Webhook chính xác của hệ thống:
   ```text
   https://<your-ngrok-domain>/webhooks/payos
   ```
   *(Ví dụ: `https://abcdef-123.ngrok-free.app/webhooks/payos`)*
4. Nhấn **Xác nhận webhook**. PayOS sẽ gửi thử một request kiểm tra tính hợp lệ đến API Gateway và báo trạng thái Xanh kết nối thành công.

---

## 4. TRIỂN KHAI FRONTEND (`pos-web`) TRÊN VERCEL

### 4.1. Cấu hình dự án trên Vercel Dashboard
1. Truy cập [https://vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub.
2. Chọn **Add New...** -> **Project** -> Chọn kho lưu trữ `KLTN_N70`.
3. Trong phần **Project Settings**:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Chọn `frontend/pos-web` (bấm `Edit` và duyệt đến thư mục `frontend/pos-web`).
   - **Build Command:** `npm run build` (hoặc để mặc định).
   - **Output Directory:** `dist` (mặc định).
   - **Install Command:** `npm install` (mặc định).

### 4.2. Cấu hình Environment Variables trên Vercel
Bạn chỉ cần cấu hình duy nhất 1 biến môi trường:
| Tên Biến | Giá trị ví dụ | Giải thích |
|---|---|---|
| `VITE_API_GATEWAY_URL` | `https://abcdef-123.ngrok-free.app` (hoặc `https://api.yourdomain.com`) | Địa chỉ duy nhất của API Gateway tiếp nhận cả REST API và WebSocket |

*(Biến `VITE_SOCKET_URL` là tùy chọn: nếu bỏ trống, Frontend sẽ tự động dùng chung domain với `VITE_API_GATEWAY_URL`).*

### 4.3. Các tệp cấu hình cốt lõi đã tích hợp
1. **`frontend/pos-web/vercel.json`:**
   Đã cấu hình rewrite toàn bộ request về `/index.html` nhằm đảm bảo cơ chế Single Page Application (SPA Routing) hoạt động ổn định khi người dùng tải lại trang (`F5`) hoặc truy cập trực tiếp các route con.
2. **AI Weight Models (`frontend/pos-web/public/models/`):**
   Toàn bộ 14 tệp trọng số phục vụ nhận diện khuôn mặt điểm danh kiosk (`@vladmandic/face-api`) đã được cấu hình track đầy đủ, Vercel sẽ tự động phân phối qua Vercel Edge CDN với tốc độ cao.
3. **Tài nguyên Ảnh Món Ăn & Đồ Uống Nội Bộ (`frontend/pos-web/public/products/`):**
   Thư mục tĩnh chứa các hình ảnh thực tế chất lượng cao (`tra-sua-tran-chau.jpg`, `khoai-tay-lac.jpg`...) được đóng gói và phục vụ trực tiếp từ Edge CDN cùng origin với web app, giải quyết dứt điểm các lỗi CORS, chặn hotlinking hoặc tải chậm từ bên thứ ba.


---

## 5. CƠ CHẾ MOCK & FALLBACK DÀNH CHO CÁC SERVICE CHƯA TRIỂN KHAI

Nhằm đảm bảo giao diện POS không bị treo hoặc gặp lỗi 502 Bad Gateway khi các service vệ tinh (`branch-service`, `product-service`, `report-service`) đang trong lộ trình hoàn thiện:

1. **`product-service` Fallback:**
   - Tuyến đường `@Public() /products`, `/products/categories`, `/products/toppings` được xử lý trực tiếp tại API Gateway.
   - Trả về danh sách thực đơn mẫu chuẩn (Trà Sữa Trân Châu Hoàng Gia, Trà Sữa Matcha Tây Bắc, Cà Phê Muối...) với đầy đủ hình ảnh, danh mục và topping.
2. **`branch-service` Fallback:**
   - Tuyến đường `@Public() /branches` trả về thông tin mặc định "Chi nhánh 1 (Trung Tâm)".
   - Tất cả Token JWT và Request Guard tại API Gateway tự động gán `branchId = "1"` nếu user chưa có `branchId` cụ thể.
3. **CORS Linh hoạt:**
   - API Gateway đã cấu hình whitelist cho phép toàn bộ domain `*.vercel.app`, `*.ngrok-free.app`, `*.ngrok.io` kết hợp `FRONTEND_URL` tùy chỉnh.

---

## 6. BẢO TRÌ & XỬ LÝ SỰ CỐ (TROUBLESHOOTING)

| Vấn đề | Nguyên nhân tiềm ẩn | Giải pháp khắc phục |
|---|---|---|
| **Lỗi Đăng nhập bị 401 & văng lại LoginScreen** | Lệch khóa bí mật `JWT_SECRET` giữa API Gateway và Auth Service. | Đảm bảo biến `JWT_SECRET` trong `.env` và `docker-compose.yml` giống nhau ở cả `api-gateway` và `auth-service`. |
| **Chấm công Kiosk báo "Nhân viên chưa tan ca"** | Nhân viên có phiên làm việc cũ chưa check-out. | Hệ thống đã có cơ chế tự động chốt phiên cũ nếu khác ngày (>16 giờ). Nếu cùng ngày, bấm "Tan ca" trước khi vào ca mới. |
| **Không nhận được Socket thông báo** | Quên cấu hình proxy WebSocket hoặc sai URL. | Kiểm tra `ORDER_SERVICE_URL` trong API Gateway trỏ đúng `http://order-service:3004` trong Docker hoặc `http://localhost:3004` ở local. |
| **PayOS báo lỗi 231 (Đơn thanh toán đã tồn tại)** | Đơn hàng được tạo lại với cùng một `orderCode` đã có trên hệ thống PayOS. | Hệ thống đã tích hợp cơ chế Self-healing Fallback tự động bắt lỗi và sinh mã VietQR Napas 247 động (MBBank `970422`), không làm gián đoạn thanh toán. |
| **Lỗi CORS trên Vercel / ngrok** | Domain chưa được Gateway nhận diện hoặc thiếu `credentials: true`. | Gateway đã tự động cho phép `*.vercel.app` và `*.ngrok-free.app`. Nếu dùng domain riêng, khai báo vào `FRONTEND_URL`. |
| **Ảnh món ăn hiển thị icon vỡ** | URL ảnh bên thứ ba bị chặn Hotlink hoặc mất mạng. | Toàn bộ ảnh đã được gán `referrerPolicy="no-referrer"` và fallback sang ảnh cục bộ `/products/` khi gặp lỗi `onError`. |
| **Lỗi Docker BuildKit: `snapshot does not exist`** | Bộ nhớ đệm BuildKit của Docker Desktop bị lỗi phân mảnh. | Chạy `docker builder prune -a -f` sau đó chạy lại lệnh build. |
| **Lỗi `lookup mirror.gcr.io: no such host`** | DNS của Docker Desktop bị kẹt hoặc mất mạng internet tạm thời. | Bỏ cờ `--build` (chỉ chạy `docker compose up -d`) hoặc chạy `wsl --shutdown` rồi mở lại Docker Desktop. |

---

## 7. HƯỚNG DẪN KẾT NỐI & QUẢN TRỊ 6 CƠ SỞ DỮ LIỆU POSTGRESQL (DATABASE-PER-SERVICE)

Mỗi microservice sở hữu một container cơ sở dữ liệu PostgreSQL độc lập được phân bổ các cổng riêng biệt trên máy host:

### 7.1. Bảng Thông Số Kết Nối Chuẩn

| Tên Dịch Vụ CSDL | Cổng Host | Tên Database | Username | Password | Dữ Liệu Quản Trị Trọng Yếu |
|---|:---:|---|---|---|---|
| **Auth DB** | `5432` | `auth_db` | `postgres` | `password` | Tài khoản, mật khẩu băm Bcrypt, vai trò RBAC |
| **Product DB** | `5434` | `product_db` | `postgres` | `password` | 26 món ăn & đồ uống, size M/L, 8 loại topping |
| **Order DB** | `5435` | `order_db` | `postgres` | `password` | Hóa đơn, thanh toán, ca trực, nhân viên & chấm công sinh trắc học |
| **Inventory DB** | `5436` | `inventory_db` | `postgres` | `password` | Nguyên liệu, định mức tồn kho, công thức món (recipes) |
| **Branch DB** | `5437` | `branch_db` | `postgres` | `password` | Danh mục chi nhánh, danh sách bàn ăn (`tables`) |
| **Reporting DB** | `5438` | `reporting_db` | `postgres` | `password` | Báo cáo doanh thu tổng hợp, phân tích sản lượng |

### 7.2. Các Bước Kết Nối Bằng VS Code Extension (Database Client)
1. Trong VS Code, mở tab **Extensions** (`Ctrl+Shift+X`), tìm và cài đặt **Database Client** (của tác giả `cweijan`).
2. Nhấp vào biểu tượng hình thùng Database trên thanh công cụ bên trái.
3. Nhấp vào nút **Create Connection** (dấu `+`), chọn **PostgreSQL**.
4. Nhập các thông số cấu hình:
   - **Host:** `localhost`
   - **Port:** Cổng tương ứng (ví dụ `5435` để xem `order_db`)
   - **Username:** `postgres`
   - **Password:** `password`
   - **Database:** Tên DB tương ứng (ví dụ: `order_db`)
5. Nhấp **Save and Connect**. Bạn có thể mở đồng thời cả 6 kết nối để duyệt bảng, xem ERD, truy vấn SQL và chỉnh sửa dữ liệu trực quan.

