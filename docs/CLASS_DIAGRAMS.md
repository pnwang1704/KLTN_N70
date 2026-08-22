# Sơ đồ Lớp Hệ thống (Class Diagrams)

Tài liệu này cung cấp các sơ đồ lớp (Class Diagrams) chuẩn UML cho toàn bộ hệ thống Microservices Quản lý Bán hàng F&B. Các sơ đồ này thể hiện chi tiết cấu trúc thực thể, thuộc tính, và các mối quan hệ nhằm phục vụ cho Báo cáo Khóa luận Tốt nghiệp.

---

## 1. Sơ đồ Tổng quan toàn hệ thống (Domain Model Overview)

Sơ đồ dưới đây thể hiện bức tranh tổng quan về các thực thể cốt lõi trong hệ thống và mối quan hệ (ảo) giữa chúng xuyên suốt các Microservices. (Lưu ý: Trong thực tế Microservices, các tham chiếu chéo được lưu dưới dạng ID - Foreign Key mềm).

```mermaid
classDiagram
    direction TB
    
    %% Core Entities
    class User
    class Branch
    class Product
    class Order
    class Ingredient
    
    %% Relationships
    Branch "1" -- "*" User : has staffs
    Branch "1" -- "*" Order : receives
    Branch "1" -- "*" Product : sells
    Branch "1" -- "*" Ingredient : stocks
    
    Order "*" -- "*" Product : contains
    Product "1" -- "*" Ingredient : made of (Recipe)
    User "1" -- "*" Order : creates (Cashier)
```

---

## 2. Sơ đồ Chi tiết theo Phân hệ (Detailed Diagrams)

### 2.1. Phân hệ Xác thực & Phân quyền (Auth Service)

Quản lý thông tin đăng nhập, nhân sự và phân quyền truy cập.

```mermaid
classDiagram
    direction LR

    class User {
        +UUID id PK
        +String username
        +String password
        +String fullName
        +Role role
        +UUID branchId FK
        +Date createdAt
        +Date updatedAt
    }

    class Role {
        <<enumeration>>
        ADMIN
        MANAGER
        CASHIER
        KITCHEN
    }

    User "*" --> "1" Role : has
```

### 2.2. Phân hệ Bán hàng & Đơn hàng (Order Service)

Quản lý luồng xử lý đơn hàng, chi tiết món ăn trong đơn và trạng thái thanh toán.

```mermaid
classDiagram
    direction TB

    class Order {
        +UUID id PK
        +UUID branchId FK
        +UUID cashierId FK
        +String tableId
        +OrderType orderType
        +OrderStatus status
        +Float totalAmount
        +Date createdAt
        +Date updatedAt
    }

    class OrderItem {
        +UUID id PK
        +UUID orderId FK
        +UUID productId FK
        +String productName
        +Integer quantity
        +Float unitPrice
        +String size
        +String note
        +OrderItemStatus status
    }

    class OrderItemTopping {
        +UUID id PK
        +UUID orderItemId FK
        +UUID toppingId FK
        +String toppingName
        +Integer quantity
        +Float price
    }

    class Payment {
        +UUID id PK
        +UUID orderId FK
        +Float amount
        +PaymentMethod method
        +PaymentStatus status
        +Date paidAt
    }

    class OrderStatus {
        <<enumeration>>
        PENDING
        IN_PROGRESS
        COMPLETED
        CANCELLED
    }

    class OrderType {
        <<enumeration>>
        AT_TABLE
        TAKE_AWAY
        DELIVERY
    }
    
    class PaymentStatus {
        <<enumeration>>
        PENDING
        SUCCESS
        FAILED
        REFUNDED
    }
    
    class PaymentMethod {
        <<enumeration>>
        CASH
        BANK_TRANSFER
        E_WALLET
    }

    Order "1" *-- "*" OrderItem : contains
    OrderItem "1" *-- "*" OrderItemTopping : has
    Order "1" *-- "0..1" Payment : settled by
    Order "*" --> "1" OrderStatus : is in
    Order "*" --> "1" OrderType : is of type
    Payment "*" --> "1" PaymentStatus : is in
    Payment "*" --> "1" PaymentMethod : uses
```

### 2.3. Phân hệ Quản lý Kho & Công thức (Inventory Service)

Quản lý định mức nguyên vật liệu, cấu hình công thức pha chế và biến động xuất nhập kho.

```mermaid
classDiagram
    direction TB

    class Ingredient {
        +UUID id PK
        +String name
        +String unit
        +Date createdAt
        +Date updatedAt
    }

    class BranchStock {
        +UUID id PK
        +UUID branchId FK
        +UUID ingredientId FK
        +Float quantity
        +Float minThreshold
    }

    class Recipe {
        +UUID id PK
        +UUID productId FK
        +String size
        +String description
        +Date createdAt
    }

    class RecipeItem {
        +UUID id PK
        +UUID recipeId FK
        +UUID ingredientId FK
        +Float requiredQuantity
    }

    class StockTransaction {
        +UUID id PK
        +UUID branchId FK
        +UUID ingredientId FK
        +TransactionType type
        +Float quantityChange
        +Float balanceAfter
        +String referenceId
        +String note
        +Date createdAt
    }

    class TransactionType {
        <<enumeration>>
        STOCK_IN
        STOCK_OUT
        SALES_DEDUCTION
        WASTE
    }

    Ingredient "1" -- "*" BranchStock : tracked in
    Recipe "1" *-- "*" RecipeItem : requires
    Ingredient "1" -- "*" RecipeItem : used as
    Ingredient "1" -- "*" StockTransaction : log history
    StockTransaction "*" --> "1" TransactionType : classified as
```

### 2.4. Phân hệ Sản phẩm & Chi nhánh (Product & Branch Services)

Quản lý danh mục (Menu), tuỳ chọn Topping, Size và Cấu trúc cửa hàng.

```mermaid
classDiagram
    direction TB

    class Category {
        +UUID id PK
        +String name
        +String description
        +Integer displayOrder
    }

    class Product {
        +UUID id PK
        +UUID categoryId FK
        +String name
        +String description
        +Float basePrice
        +String imageUrl
        +Boolean isActive
    }

    class ProductSize {
        +UUID id PK
        +UUID productId FK
        +String sizeName
        +Float priceModifier
    }

    class Topping {
        +UUID id PK
        +String name
        +Float price
        +Boolean isActive
    }

    class BranchProductAvailability {
        +UUID id PK
        +UUID branchId FK
        +UUID productId FK
        +Boolean isAvailable
    }

    class Branch {
        +UUID id PK
        +String name
        +String address
        +String phone
        +Boolean isActive
    }

    class Table {
        +UUID id PK
        +UUID branchId FK
        +String tableName
        +Integer capacity
        +TableStatus status
    }

    class TableStatus {
        <<enumeration>>
        AVAILABLE
        OCCUPIED
        RESERVED
        MAINTENANCE
    }

    Category "1" -- "*" Product : groups
    Product "1" *-- "*" ProductSize : offers
    Product "*" -- "*" Topping : allows
    Product "1" -- "*" BranchProductAvailability : sold at
    Branch "1" -- "*" BranchProductAvailability : configures menu
    Branch "1" *-- "*" Table : has
    Table "*" --> "1" TableStatus : is in
```

---

## 3. Từ điển Dữ liệu và Giải nghĩa Thực thể (Data Dictionary)

Bảng dưới đây giải thích ngắn gọn vai trò của các thực thể cốt lõi, phục vụ cho việc giải trình trong Báo cáo Khóa luận:

| Phân hệ | Thực thể (Class) | Ý nghĩa / Vai trò trong Hệ thống |
| :--- | :--- | :--- |
| **Auth** | `User` | Đại diện cho tài khoản nhân sự (Quản lý, Thu ngân, Đầu bếp) truy cập vào hệ thống POS/KDS. |
| **Auth** | `Role` | Enum định nghĩa quyền hạn (RBAC). Xác định luồng dữ liệu người dùng được phép thao tác. |
| **Order** | `Order` | Thực thể trung tâm lưu trữ thông tin về một phiên giao dịch (Đơn hàng) của khách hàng. |
| **Order** | `OrderItem` | Chi tiết một sản phẩm cụ thể (kèm kích thước và ghi chú) nằm trong một `Order`. |
| **Order** | `Payment` | Giao dịch thanh toán tài chính cho một Đơn hàng, lưu trữ số tiền và phương thức (Tiền mặt/Chuyển khoản). |
| **Inventory**| `Ingredient` | Danh mục nguyên vật liệu thô (Trà, Sữa, Trân châu) dùng để pha chế. |
| **Inventory**| `BranchStock` | Quản lý số lượng tồn kho thực tế của từng nguyên liệu tại một Chi nhánh cụ thể. |
| **Inventory**| `Recipe` | Bộ công thức định lượng nguyên liệu cho một Sản phẩm (Ví dụ: Trà sữa Size L cần bao nhiêu ml sữa). |
| **Inventory**| `StockTransaction`| Sổ kho (Log). Ghi nhận mọi giao dịch tăng/giảm kho (Nhập hàng, Trừ kho do bán, Hủy hàng). |
| **Product** | `Product` | Hàng hóa/Thức uống được trưng bày lên Menu cho khách hàng lựa chọn (Customer QR, POS). |
| **Product** | `BranchProductAvailability` | Bảng cấu hình cho phép một chi nhánh được quyền Bật/Tắt (Hết hàng/Còn hàng) một Sản phẩm cục bộ. |
| **Branch** | `Branch` | Định nghĩa thông tin cơ sở hạ tầng của một Cửa hàng vật lý. |
| **Branch** | `Table` | Định nghĩa sơ đồ bàn ăn tại cửa hàng phục vụ cho mô hình Dine-in (Dùng tại quán). |
