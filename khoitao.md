Để hệ thống có đầy đủ dữ liệu chạy demo từ đầu chí cuối, chúng ta cần nạp tiếp dữ liệu mẫu cho **7 bộ sưu tập (Collections) còn lại**.

Dưới đây là mã lệnh được viết tường minh, chia theo từng khối rõ ràng. Bạn chỉ cần copy từng đoạn này dán tiếp vào cửa sổ đen **Mongosh** của Compass là xong nhé!

### 1. Nạp dữ liệu vào Collection `stores` (Danh sách chi nhánh)

Tạo 2 chi nhánh để test tính năng quản lý chuỗi kho hàng riêng biệt.

JavaScript

```sql
db.stores.insertMany([
  {
    "_id": "store_Q1",
    "store_name": "Tiệm Bánh & Cafe - Chi nhánh Quận 1",
    "address": "123 Nguyễn Huệ, Quận 1, TP.HCM",
    "phone": "02811112222",
    "is_active": true
  },
  {
    "_id": "store_ThuDuc",
    "store_name": "Tiệm Bánh & Cafe - Chi nhánh Thủ Đức",
    "address": "53 Võ Văn Ngân, Thủ Đức, TP.HCM",
    "phone": "02833334444",
    "is_active": true
  }
]);
```

### 2. Nạp dữ liệu vào Collection `users` (Tài khoản mẫu)

Tạo sẵn 3 tài khoản tương ứng với 3 Roles bắt buộc: Admin, Nhân viên trực quầy Q1, và một Khách hàng. *(Mật khẩu mặc định đã mã hóa bcrypt của chuỗi `password123`)*.

JavaScript

```sql
db.users.insertMany([
  // 💼 Tài khoản ADMIN (Chủ Chuỗi)
  {
    "_id": "u_admin_01",
    "name": "Lê Quốc Cường (Chủ Chuỗi)",
    "email": "cuong.admin@tiembanh.com",
    "password": "$2b$10$7R9XUXW8VmswWOn3l7E2UexK4g8V9dskmE7b9IuG6A2tL9X...",
    "google_id": null,
    "role": "admin",
    "store_id": null,
    "is_active": true
  },

  // 🏪 Tài khoản STAFF (Nhân viên Thu ngân Chi nhánh Q1)
  {
    "_id": "u_staff_q1",
    "name": "Nguyễn Văn Thu ngân",
    "email": "thungan.q1@tiembanh.com",
    "password": "$2b$10$7R9XUXW8VmswWOn3l7E2UexK4g8V9dskmE7b9IuG6A2tL9X...",
    "google_id": null,
    "role": "staff",
    "store_id": "store_Q1",
    "is_active": true
  },

  // 👥 Tài khoản USER (Khách hàng đăng ký bình thường qua Form)
  {
    "_id": "u_customer_01",
    "name": "Khách Hàng A (ĐK Thường)",
    "email": "khachhangA@gmail.com",
    "password": "$2b$10$7R9XUXW8VmswWOn3l7E2UexK4g8V9dskmE7b9IuG6A2tL9X...",
    "google_id": null,
    "role": "user",
    "store_id": null,
    "is_active": true
  },

  // 🌐 Tài khoản USER (Khách hàng đăng ký nhanh bằng Google Auth)
  {
    "_id": "u_customer_02",
    "name": "Khách Hàng B (Google Auth)",
    "email": "khachhangB_google@gmail.com",
    "password": null, // Không cần lưu mật khẩu hệ thống
    "google_id": "114758392019485736251", // Chuỗi ID định danh từ Google
    "role": "user",
    "store_id": null,
    "is_active": true
  }
]);
```

### 3. Nạp dữ liệu vào Collection `tables` (Sơ đồ phòng bàn chi nhánh Q1)

Tạo sẵn 4 bàn tại chi nhánh Quận 1 với các trạng thái trống/có khách khác nhau.

JavaScript

```sql
db.tables.insertMany([
  {
    "_id": "t_q1_b1",
    "store_id": "store_Q1",
    "table_number": "Bàn 01",
    "seating_capacity": 2,
    "status": "available",
    "current_order_id": null
  },
  {
    "_id": "t_q1_b2",
    "store_id": "store_Q1",
    "table_number": "Bàn 02",
    "seating_capacity": 4,
    "status": "available",
    "current_order_id": null
  },
  {
    "_id": "t_q1_b3",
    "store_id": "store_Q1",
    "table_number": "Bàn 03",
    "seating_capacity": 4,
    "status": "occupied",
    "current_order_id": "order_pending_demo_01" // Đang găm đơn hàng chưa thanh toán
  },
  {
    "_id": "t_q1_b4",
    "store_id": "store_Q1",
    "table_number": "Bàn 04",
    "seating_capacity": 6,
    "status": "available",
    "current_order_id": null
  }
]);

db.tables.insertMany([
  // 🪑 Bàn số 05 (Sức chứa 2 người)
  {
    "_id": "t_q1_b5",
    "store_id": "store_Q1",
    "table_number": "Bàn 05",
    "seating_capacity": 2,
    "status": "available",
    "current_order_id": null
  },

  // 🪑 Bàn số 06 (Sức chứa 4 người)
  {
    "_id": "t_q1_b6",
    "store_id": "store_Q1",
    "table_number": "Bàn 06",
    "seating_capacity": 4,
    "status": "available",
    "current_order_id": null
  },

  // 🪑 Bàn số 07 (Sức chứa 4 người)
  {
    "_id": "t_q1_b7",
    "store_id": "store_Q1",
    "table_number": "Bàn 07",
    "seating_capacity": 4,
    "status": "available",
    "current_order_id": null
  },

  // 🪑 Bàn số 08 (Sức chứa 8 người - Bàn lớn cho nhóm đông)
  {
    "_id": "t_q1_b8",
    "store_id": "store_Q1",
    "table_number": "Bàn 08",
    "seating_capacity": 8,
    "status": "available",
    "current_order_id": null
  }
]);
```

### 4. Nạp dữ liệu vào Collection `coupons` (Mã giảm giá)

Tạo 2 mã giảm giá: Một mã cố định giảm 20k và một mã giảm 10% để test các trường hợp tính toán logic dòng tiền.

JavaScript

```sql
db.coupons.insertMany([
  {
    "_id": "cp_fixed_20k",
    "code": "TIEMBANH2026",
    "discount_type": "fixed",
    "discount_value": 20000,
    "min_order_value": 100000,
    "max_discount_amount": 20000,
    "start_date": new Date("2026-06-01"),
    "end_date": new Date("2026-06-30"),
    "usage_limit": 100,
    "used_count": 5,
    "used_by_users": ["u_customer_01"], // User này đã dùng, lần sau áp vào hệ thống sẽ chặn đứng lại
    "is_active": true
  },
  {
    "_id": "cp_percent_10",
    "code": "CAFEHE2026",
    "discount_type": "percentage",
    "discount_value": 10, // 10%
    "min_order_value": 50000,
    "max_discount_amount": 30000, // Giảm tối đa 30k
    "start_date": new Date("2026-06-01"),
    "end_date": new Date("2026-06-30"),
    "usage_limit": 200,
    "used_count": 0,
    "used_by_users": [],
    "is_active": true
  }
]);
```

### 5. Nạp dữ liệu vào Collection `orders` (Danh sách đơn hàng mẫu)

Tạo 2 đơn hàng: Một đơn đã thanh toán xong (`completed`), một đơn khách đang ngồi ăn tại Bàn 03 (`serving`) để test tính năng gọi thêm món/sửa món.

JavaScript

```sql
db.orders.insertMany([
  // Đơn 1: Đã hoàn thành hoàn toàn trong quá khứ
  {
    "_id": "order_done_demo_01",
    "store_id": "store_Q1",
    "table_id": "t_q1_b1",
    "created_by": "u_staff_q1",
    "order_type": "dine-in",
    "items": [
      {
        "product_id": "p_bm_1",
        "name": "Bánh mì thịt nướng",
        "price": 25000,
        "quantity": 2,
        "selected_attributes": {},
        "item_status": "served"
      },
      {
        "product_id": "p_cf_2",
        "name": "Cafe sữa đá",
        "price": 25000,
        "quantity": 2,
        "selected_attributes": { "size": "L", "ice": "100% Đá", "sugar": "50% Đường" },
        "item_status": "served"
      }
    ],
    "sub_total": 100000,
    "discount_amount": 0,
    "final_total": 100000,
    "status": "completed",
    "payment_status": "paid",
    "createdAt": new Date("2026-06-20T08:30:00Z")
  },

  // Đơn 2: Đơn đang phục vụ tại Bàn 03 (Dùng để test API sửa món/gọi thêm món)
  {
    "_id": "order_pending_demo_01",
    "store_id": "store_Q1",
    "table_id": "t_q1_b3",
    "created_by": "u_staff_q1",
    "order_type": "dine-in",
    "items": [
      {
        "product_id": "p_tira_1",
        "name": "Tiramisu truyền thống",
        "price": 55000,
        "quantity": 1,
        "selected_attributes": { "size": "M" },
        "item_status": "served"
      },
      {
        "product_id": "p_tea_4",
        "name": "Trà sen vàng",
        "price": 35000,
        "quantity": 1,
        "selected_attributes": { "size": "L", "ice": "50% Đá", "sugar": "70% Đường" },
        "item_status": "cooking" // Bếp đang làm món nước này
      }
    ],
    "sub_total": 90000,
    "discount_amount": 0,
    "final_total": 90000,
    "status": "serving",
    "payment_status": "unpaid",
    "createdAt": new Date()
  }
]);
```

### 6. Nạp dữ liệu vào Collection `chat_rooms` và `messages` (Dữ liệu Live Chat AI)

Thiết lập sẵn một phòng chat chưa được giải quyết (`is_resolved: false`) để test Socket.io thời gian thực.

JavaScript

```sql
// Nạp vào chat_rooms
db.chat_rooms.insertMany([
   // Cấu trúc một bản ghi phòng chat AI mẫu trong DB
{
  "_id": "room_ai_u_admin_01",
  "customer_id": "u_admin_01", // ID của người tham gia (có thể là admin, staff, hoặc user)
  "user_role": "admin",        // 💡 MỚI: Dùng để phân quyền dữ liệu nạp cho AI
  "is_ai_room": true,          // 💡 MỚI: true = Chat với AI, false = Chat với người thật
  "last_message": "Công thức pha Cafe sữa đá là gì?",
  "updatedAt": "2026-06-21T03:30:00Z"
}
  
]);

// Nạp vào messages
db.messages.insertMany([
  {
    "_id": "m_001",
    "room_id": "room_customer_01",
    "sender_id": "u_customer_01",
    "sender_type": "user",
    "message_text": "Shop ơi, bánh kem dâu size L có sẵn ở chi nhánh Q1 không?",
    "is_read": false,
    "createdAt": new Date()
  }
]);
```

### 7. Nạp dữ liệu vào Collection `shifts` (Quản lý ca trực)

Tạo một ca trực đang mở của nhân viên ca sáng tại chi nhánh Q1. Tiền mặt của Đơn 1 (`100,000đ`) đã được tự động cộng dồn vào máy.

JavaScript

```sql
db.shifts.insertMany([
{
  "_id": "shift_demo_q1_01",
  "store_id": "store_Q1",
  "staff_id": "u_staff_q1",
  "status": "closed",
  
  // 💰 TIỀN BẠC (Mục tổng tiền)
  "opening_cash": 500000,           // Tiền mặt thối đầu ca
  "system_cash_collected": 1200000, // Tổng tiền mặt THU ĐƯỢC từ các bill hoàn thành (Máy tính)
  "system_banking_collected": 800000,// Tổng tiền chuyển khoản QR/Momo nhận được trong ca
  "closing_cash_actual": 1700000,   // Tiền mặt THỰC TẾ Admin/Nhân viên đếm được trong két lúc giao ca
  "difference": 0,                  // Lệch tiền (Thực tế - Lý thuyết)
  
  // 📊 THỐNG KÊ HÓA ĐƠN (Mục tổng bill)
  "total_bills_completed": 25,      // Tổng số hóa đơn bán thành công trong ca
  "total_bills_cancelled": 2,       // Tổng số hóa đơn bị hủy/bấm nhầm (Để Admin click vào xem danh sách bill nhầm)
  
  "note": "Hủy 2 bill do nhân viên ca trước bấm nhầm số bàn. Tiền két khớp.",
  "end_time": "2026-06-20T14:00:00Z"
}
  
]);
```

Để dễ quan sát cấu trúc dữ liệu và chỉnh sửa khi cần thiết, mình sẽ tách chuỗi mã lệnh dài lúc nãy thành các **khối lệnh tường minh (được định dạng xuống dòng thụt lề rõ ràng)** cho từng Collection.

Bạn hoàn toàn có thể copy từng khối lệnh này paste vào Mongosh của Compass và nhấn Enter, hệ thống vẫn hiểu và thực thi bình thường nhé!

### 1. Nạp dữ liệu vào Collection `categories` (Danh mục)

JavaScript

```sql
db.categories.insertMany([
  { "_id": "cat_banhmi", "name": "Bánh mì", "slug": "banh-mi", "is_active": true },
  { "_id": "cat_donut", "name": "Donut", "slug": "donut", "is_active": true },
  { "_id": "cat_cake", "name": "Bánh kem", "slug": "banh-kem", "is_active": true },
  { "_id": "cat_tiramisu", "name": "Tiramisu", "slug": "tiramisu", "is_active": true },
  { "_id": "cat_coffee", "name": "Cà phê", "slug": "ca-phe", "is_active": true },
  { "_id": "cat_tea", "name": "Trà", "slug": "tra", "is_active": true }
]);
```

### 2. Nạp dữ liệu nhóm Bánh vào Collection `products`

JavaScript

```sql
db.products.insertMany([
  // 🥖 BÁNH MÌ
  {
    "_id": "p_bm_1",
    "category_id": "cat_banhmi",
    "name": "Bánh mì thịt nướng",
    "slug": "banh-mi-thit-nuong",
    "image": "https://api.tiembanh.com/images/bm-thitnuong.jpg",
    "origin_price": 25000,
    "sale_price": 25000,
    "attributes": {},
    "inventory": [{ "store_id": "store_Q1", "stock": 20, "is_available": true }]
  },
  {
    "_id": "p_bm_2",
    "category_id": "cat_banhmi",
    "name": "Bánh mì chả cá",
    "slug": "banh-mi-cha-ca",
    "image": "https://api.tiembanh.com/images/bm-chaca.jpg",
    "origin_price": 22000,
    "sale_price": 22000,
    "attributes": {},
    "inventory": [{ "store_id": "store_Q1", "stock": 15, "is_available": true }]
  },
  {
    "_id": "p_bm_3",
    "category_id": "cat_banhmi",
    "name": "Bánh mì trứng ốp la",
    "slug": "banh-mi-trung-op-la",
    "image": "https://api.tiembanh.com/images/bm-opla.jpg",
    "origin_price": 20000,
    "sale_price": 20000,
    "attributes": {},
    "inventory": [{ "store_id": "store_Q1", "stock": 30, "is_available": true }]
  },

  // 🍩 DONUT
  {
    "_id": "p_donut_1",
    "category_id": "cat_donut",
    "name": "Donut socola",
    "slug": "donut-socola",
    "image": "https://api.tiembanh.com/images/donut-socola.jpg",
    "origin_price": 30000,
    "sale_price": 30000,
    "attributes": {},
    "inventory": [{ "store_id": "store_Q1", "stock": 10, "is_available": true }]
  },
  {
    "_id": "p_donut_2",
    "category_id": "cat_donut",
    "name": "Donut dâu",
    "slug": "donut-dau",
    "image": "https://api.tiembanh.com/images/donut-dau.jpg",
    "origin_price": 30000,
    "sale_price": 30000,
    "attributes": {},
    "inventory": [{ "store_id": "store_Q1", "stock": 10, "is_available": true }]
  },
  {
    "_id": "p_donut_3",
    "category_id": "cat_donut",
    "name": "Donut matcha",
    "slug": "donut-matcha",
    "image": "https://api.tiembanh.com/images/donut-matcha.jpg",
    "origin_price": 32000,
    "sale_price": 32000,
    "attributes": {},
    "inventory": [{ "store_id": "store_Q1", "stock": 8, "is_available": true }]
  },
  {
    "_id": "p_donut_4",
    "category_id": "cat_donut",
    "name": "Donut vani",
    "slug": "donut-vani",
    "image": "https://api.tiembanh.com/images/donut-vani.jpg",
    "origin_price": 28000,
    "sale_price": 28000,
    "attributes": {},
    "inventory": [{ "store_id": "store_Q1", "stock": 12, "is_available": true }]
  },

  // 🍰 BÁNH KEM
  {
    "_id": "p_cake_1",
    "category_id": "cat_cake",
    "name": "Bánh kem dâu",
    "slug": "banh-kem-dau",
    "image": "https://api.tiembanh.com/images/cake-dau.jpg",
    "origin_price": 180000,
    "sale_price": 180000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 50000 }]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 5, "is_available": true }]
  },
  {
    "_id": "p_cake_2",
    "category_id": "cat_cake",
    "name": "Bánh kem socola",
    "slug": "banh-kem-socola",
    "image": "https://api.tiembanh.com/images/cake-socola.jpg",
    "origin_price": 190000,
    "sale_price": 190000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 50000 }]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 4, "is_available": true }]
  },
  {
    "_id": "p_cake_3",
    "category_id": "cat_cake",
    "name": "Bánh kem matcha",
    "slug": "banh-kem-matcha",
    "image": "https://api.tiembanh.com/images/cake-matcha.jpg",
    "origin_price": 195000,
    "sale_price": 195000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 50000 }]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 3, "is_available": true }]
  },
  {
    "_id": "p_cake_4",
    "category_id": "cat_cake",
    "name": "Bánh kem trái cây",
    "slug": "banh-kem-trai-cay",
    "image": "https://api.tiembanh.com/images/cake-traicay.jpg",
    "origin_price": 200000,
    "sale_price": 200000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 50000 }]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 5, "is_available": true }]
  },

  // 🍮 TIRAMISU
  {
    "_id": "p_tira_1",
    "category_id": "cat_tiramisu",
    "name": "Tiramisu truyền thống",
    "slug": "tiramisu-truyen-thong",
    "image": "https://api.tiembanh.com/images/tira-truyen-thong.jpg",
    "origin_price": 55000,
    "sale_price": 55000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 10000 }]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 15, "is_available": true }]
  },
  {
    "_id": "p_tira_2",
    "category_id": "cat_tiramisu",
    "name": "Tiramisu matcha",
    "slug": "tiramisu-matcha",
    "image": "https://api.tiembanh.com/images/tira-matcha.jpg",
    "origin_price": 60000,
    "sale_price": 60000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 10000 }]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 10, "is_available": true }]
  },
  {
    "_id": "p_tira_3",
    "category_id": "cat_tiramisu",
    "name": "Tiramisu dâu",
    "slug": "tiramisu-dau",
    "image": "https://api.tiembanh.com/images/tira-dau.jpg",
    "origin_price": 60000,
    "sale_price": 60000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 10000 }]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 10, "is_available": true }]
  },
  {
    "_id": "p_tira_4",
    "category_id": "cat_tiramisu",
    "name": "Tiramisu cacao đậm",
    "slug": "tiramisu-cacao-dam",
    "image": "https://api.tiembanh.com/images/tira-cacao.jpg",
    "origin_price": 65000,
    "sale_price": 65000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 10000 }]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 12, "is_available": true }]
  }
]);
```

### 3. Nạp dữ liệu nhóm Đồ uống vào Collection `products`

JavaScript

```sql
db.products.insertMany([
  // ☕ CÀ PHÊ
  {
    "_id": "p_cf_1",
    "category_id": "cat_coffee",
    "name": "Cafe đen đá",
    "slug": "cafe-den-da",
    "image": "https://api.tiembanh.com/images/cf-denda.jpg",
    "origin_price": 20000,
    "sale_price": 20000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }],
      "ice_levels": ["100% Đá", "50% Đá", "Không Đá"],
      "sugar_levels": ["100% Đường", "50% Đường", "Không Đường"]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 99, "is_available": true }]
  },
  {
    "_id": "p_cf_2",
    "category_id": "cat_coffee",
    "name": "Cafe sữa đá",
    "slug": "cafe-sua-da",
    "image": "https://api.tiembanh.com/images/cf-suada.jpg",
    "origin_price": 25000,
    "sale_price": 25000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }],
      "ice_levels": ["100% Đá", "50% Đá", "Không Đá"],
      "sugar_levels": ["100% Đường", "50% Đường", "Không Đường"]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 99, "is_available": true }]
  },
  {
    "_id": "p_cf_3",
    "category_id": "cat_coffee",
    "name": "Bạc xỉu",
    "slug": "bac-xiu",
    "image": "https://api.tiembanh.com/images/bac-xiu.jpg",
    "origin_price": 28000,
    "sale_price": 28000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }],
      "ice_levels": ["100% Đá", "50% Đá", "Không Đá"],
      "sugar_levels": ["100% Đường", "50% Đường", "Không Đường"]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 99, "is_available": true }]
  },
  {
    "_id": "p_cf_4",
    "category_id": "cat_coffee",
    "name": "Latte",
    "slug": "latte",
    "image": "https://api.tiembanh.com/images/latte.jpg",
    "origin_price": 35000,
    "sale_price": 35000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 7000 }],
      "ice_levels": ["100% Đá", "Nóng"],
      "sugar_levels": ["100% Đường", "Ít Đường"]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 99, "is_available": true }]
  },
  {
    "_id": "p_cf_5",
    "category_id": "cat_coffee",
    "name": "Cappuccino",
    "slug": "cappuccino",
    "image": "https://api.tiembanh.com/images/cappuccino.jpg",
    "origin_price": 35000,
    "sale_price": 35000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 7000 }],
      "ice_levels": ["100% Đá", "Nóng"]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 99, "is_available": true }]
  },
  {
    "_id": "p_cf_6",
    "category_id": "cat_coffee",
    "name": "Americano",
    "slug": "americano",
    "image": "https://api.tiembanh.com/images/americano.jpg",
    "origin_price": 30000,
    "sale_price": 30000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }],
      "ice_levels": ["100% Đá", "Đá Ít", "Nóng"]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 99, "is_available": true }]
  },

  // 🍵 TRÀ
  {
    "_id": "p_tea_1",
    "category_id": "cat_tea",
    "name": "Trà đào",
    "slug": "tra-dao",
    "image": "https://api.tiembanh.com/images/tra-dao.jpg",
    "origin_price": 30000,
    "sale_price": 30000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }],
      "ice_levels": ["100% Đá", "50% Đá"],
      "sugar_levels": ["100% Đường", "70% Đường"]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 50, "is_available": true }]
  },
  {
    "_id": "p_tea_2",
    "category_id": "cat_tea",
    "name": "Trà chanh",
    "slug": "tra-chanh",
    "image": "https://api.tiembanh.com/images/tra-chanh.jpg",
    "origin_price": 20000,
    "sale_price": 20000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }],
      "ice_levels": ["100% Đá", "50% Đá"]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 60, "is_available": true }]
  },
  {
    "_id": "p_tea_3",
    "category_id": "cat_tea",
    "name": "Trà vải",
    "slug": "tra-vai",
    "image": "https://api.tiembanh.com/images/tra-vai.jpg",
    "origin_price": 32000,
    "sale_price": 32000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }],
      "ice_levels": ["100% Đá", "50% Đá"]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 40, "is_available": true }]
  },
  {
    "_id": "p_tea_4",
    "category_id": "cat_tea",
    "name": "Trà sen vàng",
    "slug": "tra-sen-vang",
    "image": "https://api.tiembanh.com/images/tra-senvang.jpg",
    "origin_price": 35000,
    "sale_price": 35000,
    "attributes": {
      "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 7000 }],
      "ice_levels": ["100% Đá", "50% Đá"],
      "sugar_levels": ["100% Đường", "70% Đường"]
    },
    "inventory": [{ "store_id": "store_Q1", "stock": 35, "is_available": true }]
  }
]);
```

**BẢNG ĐẶC TẢ CHI TIẾT DỊCH VỤ RESTFUL API (ĐẦY ĐỦ 70 ENDPOINTS CHUẨN DỰ ÁN)**

| **STT** | **Module** | **HTTP Method** | **API Endpoint Route** | **HTTP Status OK** | **HTTP Status Lỗi** | **Chức năng chi tiết** |
| --- | --- | --- | --- | --- | --- | --- |
| **1** | **Auth** | `POST` | `/api/v1/auth/register` | `201` Created | `400` Bad Request | Khách hàng tự đăng ký tài khoản mới |
| **2** | **Auth** | `POST` | `/api/v1/auth/login` | `200` OK | `401` Unauthorized | Đăng nhập hệ thống (Cấp Access Token & Refresh Token) |
| **3** | **Auth** | `POST` | `/api/v1/auth/google` | `200` OK | `400` Bad Request | Đăng nhập / Đăng ký nhanh bằng Google OAuth2 |
| **4** | **Auth** | `POST` | `/api/v1/auth/refresh-token` | `200` OK | `401` Unauthorized | Tự động làm mới Access Token từ Refresh Token |
| **5** | **Auth** | `POST` | `/api/v1/auth/logout` | `200` OK | `401` Unauthorized | Đăng xuất người dùng, vô hiệu hóa Token |
| **6** | **Auth** | `POST` | `/api/v1/auth/verify-pin` | `200` OK | `400` Bad Request | Xác thực mã PIN Quản lý/Admin khi sửa/hủy món |
| **7** | **Auth** | `GET` | `/api/v1/users/profile` | `200` OK | `401` Unauthorized | Xem thông tin hồ sơ cá nhân của người dùng hiện tại |
| **8** | **Auth** | `GET` | `/api/v1/users` | `200` OK | `403` Forbidden | Admin xem danh sách tất cả tài khoản người dùng |
| **9** | **Auth** | `PATCH` | `/api/v1/users/:id/role` | `200` OK | `403` Forbidden | Admin phân quyền tài khoản (admin, staff, user) |
| **10** | **Store** | `GET` | `/api/v1/stores` | `200` OK | `500` Server Error | Xem danh sách toàn bộ các chi nhánh cửa hàng |
| **11** | **Store** | `POST` | `/api/v1/stores` | `201` Created | `400`, `403` Forbidden | Admin khởi tạo chi nhánh cửa hàng mới |
| **12** | **Store** | `PUT` | `/api/v1/stores/:id` | `200` OK | `404` Not Found | Admin cập nhật thông tin chi nhánh cửa hàng |
| **13** | **Table** | `GET` | `/api/v1/stores/:store_id/tables` | `200` OK | `404` Not Found | Lấy sơ đồ phòng bàn của chi nhánh cụ thể |
| **14** | **Table** | `POST` | `/api/v1/tables` | `201` Created | `400`, `403` Forbidden | Admin thêm bàn mới vào sơ đồ chi nhánh |
| **15** | **Table** | `PATCH` | `/api/v1/tables/:id/status` | `200` OK | `404` Not Found | Cập nhật trạng thái bàn thủ công (`available` / `occupied`) |
| **16** | **Product** | `GET` | `/api/v1/products` | `200` OK | `500` Server Error | Xem thực đơn món ăn & đồ uống theo chi nhánh |
| **17** | **Product** | `GET` | `/api/v1/products/:id` | `200` OK | `404` Not Found | Xem chi tiết thuộc tính món (size, đường, đá...) |
| **18** | **Product** | `POST` | `/api/v1/products` | `201` Created | `400`, `403` Forbidden | Admin thêm sản phẩm mới vào Menu |
| **19** | **Product** | `PUT` | `/api/v1/products/:id` | `200` OK | `404` Not Found | Admin chỉnh sửa thông tin chi tiết sản phẩm |
| **20** | **Product** | `DELETE` | `/api/v1/products/:id` | `200` OK | `404` Not Found | Admin xóa sản phẩm khỏi Menu |
| **21** | **Product** | `PATCH` | `/api/v1/products/:id/stock` | `200` OK | `400`, `404` Not Found | Admin/Staff cập nhật số lượng tồn kho theo chi nhánh |
| **22** | **Product** | `PATCH` | `/api/v1/products/:id/toggle-status` | `200` OK | `404` Not Found | Bật/tắt trạng thái kinh doanh (`selling` / `out_of_stock`) |
| **23** | **Product** | `GET` | `/api/v1/categories` | `200` OK | `500` Server Error | Lấy danh sách danh mục (Bánh mì, Donut, Cà phê, Trà...) |
| **24** | **Product** | `POST` | `/api/v1/categories` | `201` Created | `400` Bad Request | Admin thêm danh mục sản phẩm mới |
| **25** | **Inventory** | `GET` | `/api/v1/inventory/summary` | `200` OK | `403` Forbidden | Xem tổng quan báo cáo xuất nhập tồn kho chi nhánh |
| **26** | **Inventory** | `POST` | `/api/v1/inventory/log` | `201` Created | `400` Bad Request | Ghi nhật ký nhập kho / xuất kho / điều chỉnh tồn |
| **27** | **Order** | `GET` | `/api/v1/orders` | `200` OK | `500` Server Error | Lấy danh sách đơn hàng có lọc theo vai trò & chi nhánh |
| **28** | **Order** | `POST` | `/api/v1/orders/dine-in` | `201` Created | `400` Bad Request | Mở bàn ăn tại quán & tạo đơn hàng nháp (`occupied`) |
| **29** | **Order** | `POST` | `/api/v1/orders/take-away` | `201` Created | `400` Bad Request | Tạo đơn hàng mang đi / giao hàng tận nơi mới |
| **30** | **Order** | `GET` | `/api/v1/orders/:id` | `200` OK | `404` Not Found | Truy vấn thông tin chi tiết đơn hàng & trạng thái PayOS |
| **31** | **Order** | `PATCH` | `/api/v1/orders/:id/add-items` | `200` OK | `400` Bad Request | Khách/Staff gọi thêm món mới, ghép vào đơn đang phục vụ |
| **32** | **Order** | `PUT` | `/api/v1/orders/:id/edit-items` | `200` OK | `400` Bad Request | Đổi món/sửa số lượng món kèm lưu vết `cancelled_items` |
| **33** | **Order** | `PATCH` | `/api/v1/orders/:id/item-status` | `200` OK | `404` Not Found | Bếp cập nhật trạng thái chế biến món (`cooking` / `served`) |
| **34** | **Order** | `POST` | `/api/v1/orders/:id/apply-coupon` | `200` OK | `400` Bad Request | Áp mã giảm giá vào đơn hàng, tính lại `final_total` |
| **35** | **Order** | `POST` | `/api/v1/orders/:id/settle` | `200` OK | `400` Bad Request | Chốt hóa đơn thanh toán thành công & giải phóng bàn |
| **36** | **Order** | `POST` | `/api/v1/orders/:id/cancel` | `200` OK | `400` Bad Request | Hủy đơn hàng (Giải phóng bàn, hoàn trả lại tồn kho) |
| **37** | **Order** | `GET` | `/api/v1/orders/:id/print-draft` | `200` OK | `404` Not Found | Lấy dữ liệu mẫu để in phiếu thanh toán tạm tính |
| **38** | **Order** | `POST` | `/api/v1/orders/:id/accept` | `200` OK | `404` Not Found | Staff tiếp nhận đơn hàng mới (`pending_confirm` -> `serving`) |
| **39** | **Order** | `POST` | `/api/v1/orders/:id/ready` | `200` OK | `404` Not Found | Bếp báo đã làm xong tất cả món (`serving` -> `ready`) |
| **40** | **Order** | `POST` | `/api/v1/orders/:id/revert-serving` | `200` OK | `404` Not Found | Staff chuyển đơn từ Chờ trả quay lại Bếp (`ready` -> `serving`) |
| **41** | **Order** | `POST` | `/api/v1/orders/:id/confirm` | `200` OK | `404` Not Found | Cập nhật cờ xác nhận giỏ hàng `is_confirmed` |
| **42** | **Order** | `POST` | `/api/v1/orders/:id/payos-link` | `200` OK | `400` Bad Request | Tạo SDK Payment Link & Mã VietQR thanh toán PayOS |
| **43** | **Order** | `PATCH` | `/api/v1/orders/:id/flag` | `200` OK | `404` Not Found | Cập nhật ghi chú & đánh cờ cảnh báo nghi vấn đơn hàng |
| **44** | **Order** | `DELETE` | `/api/v1/orders/:id` | `200` OK | `404` Not Found | Admin xóa vĩnh viễn bản ghi đơn hàng khỏi Database |
| **45** | **Webhook** | `GET` | `/api/webhooks/payos` | `200` OK | `500` Server Error | PayOS Dashboard gửi request kiểm tra endpoint tồn tại |
| **46** | **Webhook** | `POST` | `/api/webhooks/payos` | `200` OK | `400` Bad Request | Nhận tín hiệu Webhook tự động nhận biết tiền về từ PayOS |
| **47** | **Shift** | `POST` | `/api/v1/shifts/open` | `21` Created | `400` Bad Request | Nhân viên mở ca mới & khai báo tiền thối két đầu ca |
| **48** | **Shift** | `POST` | `/api/v1/shifts/close` | `200` OK | `404` Not Found | Chốt kết ca, đếm tiền két thực tế & tính chênh lệch |
| **49** | **Shift** | `POST` | `/api/v1/shifts/handover` | `200` OK | `400` Bad Request | Bàn giao ca tự động: Đóng ca cũ và mở ca mới ngay lập tức |
| **50** | **Shift** | `GET` | `/api/v1/shifts/current` | `200` OK | `404` Not Found | Lấy thông tin chi tiết ca làm việc đang diễn ra |
| **51** | **Shift** | `GET` | `/api/v1/shifts/history` | `200` OK | `403` Forbidden | Truy vấn lịch sử danh sách toàn bộ các ca làm việc |
| **52** | **Shift** | `GET` | `/api/v1/shifts/sync-cash` | `200` OK | `401` Unauthorized | Đồng bộ và xem tổng tiền mặt & chuyển khoản trong ca |
| **53** | **Coupon** | `GET` | `/api/v1/coupons` | `200` OK | `500` Server Error | Lấy danh sách tất cả các mã giảm giá hiện có |
| **54** | **Coupon** | `POST` | `/api/v1/coupons` | `21` Created | `400` Bad Request | Admin khởi tạo mã giảm giá mới kèm điều kiện |
| **55** | **Coupon** | `PUT` | `/api/v1/coupons/:id` | `200` OK | `404` Not Found | Admin cập nhật điều kiện, số lượng hoặc hạn dùng mã |
| **56** | **Coupon** | `DELETE` | `/api/v1/coupons/:id` | `200` OK | `404` Not Found | Admin vô hiệu hóa hoặc xóa mã giảm giá |
| **57** | **Chat** | `POST` | `/api/v1/chats/rooms` | `21` Created | `401` Unauthorized | Khởi tạo phòng tư vấn trực tuyến (Live Chat) mới |
| **58** | **Chat** | `GET` | `/api/v1/chats/rooms` | `200` OK | `403` Forbidden | Lấy danh sách các phòng tư vấn trực tuyến đang chờ |
| **59** | **Chat** | `GET` | `/api/v1/chats/rooms/:id/messages` | `200` OK | `404` Not Found | Tải lịch sử trao đổi tin nhắn trong phòng chat |
| **60** | **Chat** | `POST` | `/api/v1/chats/rooms/:id/messages` | `200` OK | `400` Bad Request | Gửi tin nhắn mới vào phòng chat |
| **61** | **Admin Dashboard** | `GET` | `/api/v1/dashboard/revenue-stats` | `200` OK | `403` Forbidden | Admin xem thống kê doanh thu theo mốc thời gian |
| **62** | **Admin Dashboard** | `GET` | `/api/v1/dashboard/top-selling` | `200` OK | `403` Forbidden | Thống kê danh sách top 5 món bán chạy nhất |
| **63** | **Admin Dashboard** | `GET` | `/api/v1/dashboard/slow-moving` | `200` OK | `403` Forbidden | Thống kê danh sách các món bán chậm nhất |
| **64** | **Admin Dashboard** | `GET` | `/api/v1/dashboard/low-stock` | `200` OK | `403` Forbidden | Thống kê cảnh báo các món có số lượng kho sắp hết |
| **65** | **AI Assistant** | `POST` | `/api/v1/ai/chat-assistant` | `200` OK | `500` Server Error | Trợ lý AI Gemini trả lời tư vấn menu & nghiệp vụ |
| **66** | **Notification** | `GET` | `/api/v1/notifications` | `200` OK | `401` Unauthorized | Lấy danh sách thông báo gửi cho người dùng |
| **67** | **Notification** | `POST` | `/api/v1/notifications` | `21` Created | `403` Forbidden | Admin phát thông báo hệ thống mới |
| **68** | **Notification** | `PATCH` | `/api/v1/notifications/:id/read` | `200` OK | `404` Not Found | Đánh dấu đã đọc một thông báo cụ thể |
| **69** | **Notification** | `PATCH` | `/api/v1/notifications/read-all` | `200` OK | `401` Unauthorized | Đánh dấu đã đọc toàn bộ danh sách thông báo |
| **70** | **System Keep-Alive** | `GET` | `/ping` hoặc `/health` | `200` OK | `500` Server Error | Kiểm tra tình trạng máy chủ & Giữ Render luôn tỉnh táo 24/7 |

## Cách 1: Sử dụng tài khoản Cá nhân thật của bạn kết hợp với PayOS (Khuyên dùng)

Hiện tại, PayOS cho phép bạn liên kết **tài khoản ngân hàng cá nhân chính chủ** của bạn (Vietcombank, MBBank, ACB...) vào hệ thống của họ để làm môi trường **Live (Chạy thật)** mà **KHÔNG cần giấy phép kinh doanh**.

### 🔄 Luồng hoạt động:

1. Khi bấm nút thanh toán, hệ thống gọi API PayOS tạo mã QR động dựa trên số tài khoản thật của bạn.
2. Khách (hoặc chính bạn lúc demo) dùng app ngân hàng quét mã QR này ➔ Hệ thống tự điền số tài khoản của bạn, số tiền thật (ví dụ: `2,000đ` để test) và nội dung chuyển khoản duy nhất.
3. Bạn bấm chuyển khoản `2,000đ` tiền thật ➔ Tiền tinh tinh vào tài khoản của bạn ➔ Ngân hàng báo cho PayOS ➔ PayOS bắn tín hiệu về Node.js ➔ Giao diện POS tự động nhảy chữ **"Thanh toán thành công"**.

> **🎯 Ưu điểm:** Cực kỳ thuyết phục. Khi demo trước hội đồng, bạn lấy điện thoại ra quét mã, tài khoản ngân hàng của bạn nhận được 2k tiền thật và màn hình web tự động chuyển sang trang thành công. Giảng viên sẽ đánh giá rất cao vì hệ thống chạy real-time 100%.
> 

## 1) Layout tổng thể (Main Layout)

- **Top Bar (cố định):**
    - Tên nhân viên: `Lê Quốc Cường`
    - Mã ca trực: `shift_demo...`
    - Nút **[Đồng bộ két tiền]**
    - Icon **[Tin nhắn Live Chat]** (badge đỏ)
- **Khu nội dung chính:** nằm dưới Top Bar, thay đổi theo từng màn hình.

## 2) Màn hình chọn luồng phục vụ (màn hình đầu tiên)

- 3 nút lớn:
    1. **[Giao hàng]** → mở Menu (đơn giao)
    2. **[Đặt tại quán (Take-away)]** → mở Menu (đơn mang đi)
    3. **[Ngồi tại bàn (Dine-in)]** → hiển thị **Sơ đồ 8 bàn**
        - **Available (xanh):** bấm → popup “Xác nhận vào bàn” → → bàn chuyển **Occupied (đỏ)** → vào Menu chọn món
        - **Occupied (đỏ):** bấm → vào thẳng giỏ hàng của đơn hiện tại (xem/chỉnh ( nhân viên chỉ được chỉnh số tiền lớn hơn bill hiện tại ) /in bill tạm tính)

## 3) Màn hình Order món (2 cột Trái – Phải)

- **Cột trái — Menu & cấu hình:**
    - Tabs danh mục (Bánh mì, Trà, Cafe, Donut…)
    - Chọn món → mở Modal cấu hình: **Size** (M/L), **Đường**, **Đá**… → bấm “Thêm” để đưa sang giỏ
    - **Màn hình Bếp (phụ):**
        - Tab **Cooking** (món đang làm)
        - Tab **Served** (món đã xong)
        - Bấm đổi trạng thái → món tự chuyển tab
- **Cột phải — Giỏ hàng & hành động:**
    - Danh sách món của bàn (số lượng, size, option)
    - Nút **[+] [-]** tăng/giảm, sửa nhanh tại chỗ
    - **[Hủy/Giảm món]:** yêu cầu PIN Admin (Giải pháp A) → backend ghi log ẩn `cancelled_items` (Giải pháp C)
    - có 2 nút là xác nhận và thanh toán ( ấn xác nhận ra bill tạm tính ) còn thanh toán sẽ ra popup QR động
    - **Khối hành động cuối:**
        - **[In Bill Tạm Tính]** → popup bill nháp
        - **[Thanh toán QR PayOS]** → popup QR động → thanh toán thành công → tự đóng → bàn chuyển xanh

## 4) Màn hình Chốt ca (Shift Report) & Dashboard Admin

- **Staff kết ca:** nhập tiền mặt thực tế → hiển thị tổng kết:
    - Tổng tiền mặt hệ thống tính
    - Tổng tiền Banking QR
    - Tổng bill hoàn thành
    - Tổng bill hủy nhầm trong ngày
    - ở một nút nào đó ở header trên cùng nút ca hay gì đó đi
    
- **Admin Dashboard:** biểu đồ doanh thu + thống kê nhanh:
    - Món bán chạy
    - Món bán chậm
    - Cảnh báo tồn kho sắp hết

chuỗi cửa hàng pos lần 2

cake_drink_pos/
│
├── backend/                             # --- BACKEND NODE.JS (EXPRESS) ---
│   ├── config/
│   │   ├── db.js                        # Kết nối MongoDB Atlas
│   │   └── payos.js                     # Cấu hình cổng thanh toán PayOS
│   ├── constants/                       # Lưu trữ dữ liệu tĩnh (Menu, công thức cho AI đọc)
│   │   ├── ai_knowledge_user.md         # Dữ liệu quán cho Khách hàng xem
│   │   └── ai_knowledge_staff.md        # Tài liệu nghiệp vụ cho Nhân viên
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── orderController.js           # Xử lý đơn hàng, log hủy món (cancelled_items)
│   │   ├── shiftController.js           # Xử lý đóng/mở ca trực
│   │   └── aiController.js              # Xử lý gọi Gemini API cho phòng chat AI (API 42, 49)
│   ├── middlewares/
│   │   ├── authMiddleware.js            # Xác thực JWT và phân quyền (Admin/Staff/User)
│   │   └── errorMiddleware.js           # Xử lý lỗi tập trung (Trả về Status Code 400, 403, 500)
│   ├── models/
│   │   ├── User.js
│   │   ├── Order.js                     # Schema có thêm cancelled_items
│   │   ├── Table.js
│   │   ├── ChatRoom.js                  # Schema có thêm is_ai_room, user_role
│   │   ├── Message.js
│   │   └── Shift.js
│   ├── routes/
│   │   ├── api.js                       # Tổng hợp và phân cấp nhánh toàn bộ 49 API v1
│   │   └── webhooks.js                  # Đường dẫn riêng nhận tín hiệu PayOS (API 28)
│   ├── .env                             # Lưu biến môi trường (MONGO_URI, PAYOS_KEYS, GEMINI_KEY)
│   ├── server.js                        # File chạy chính (Khởi tạo Express + Socket.io)
│   └── package.json
│
└── frontend/                            # --- FRONTEND VITE + REACT ---
├── public/
├── src/
│   ├── assets/                      # Hình ảnh logo, icon bánh nước
│   ├── components/                  # Các thành phần giao diện dùng chung
│   │   ├── Sidebar.jsx              # Thanh bên chứa ô Tìm kiếm + Nút AI cố định + List Khách
│   │   ├── Topbar.jsx               # Thanh trên cùng hiện tên, ca trực, thông báo chat
│   │   └── OrderCart.jsx            # Giỏ hàng bên phải cho phép sửa đổi số lượng
│   ├── context/
│   │   └── AuthContext.jsx          # Quản lý trạng thái đăng nhập toàn hệ thống
│   ├── pages/                       # Các màn hình chính
│   │   ├── Login.jsx                # Form đăng nhập + Nút đăng nhập Google Auth
│   │   ├── ServiceSelection.jsx     # Màn hình chọn 3 nút: Giao hàng / Mang đi / Tại quán
│   │   ├── TableMap.jsx             # Sơ đồ lưới 8 bàn ăn (Xanh / Đỏ)
│   │   ├── OrderMenu.jsx            # Màn hình chọn món (Cột trái món ăn, Cột phải giỏ hàng)
│   │   ├── KitchenDashboard.jsx     # Màn hình bếp đơn giản (Tab Cooking / Tab Served)
│   │   ├── ChatDashboard.jsx        # Màn hình chat (Trái: Danh sách phòng, Phải: Khung chat)
│   │   └── AdminDashboard.jsx       # Màn hình thống kê doanh thu, kho, món bán chạy/chậm
│   ├── services/
│   │   └── api.js                   # Cấu hình Axios để gọi lên Backend
│   ├── App.jsx                      # Định tuyến các màn hình (React Router Dom)
│   └── main.jsx
├── index.html
├── vite.config.js
└── package.json