const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Category = require('./models/Category');
const Product = require('./models/Product');
const Store = require('./models/Store');
const User = require('./models/User');
const Table = require('./models/Table');
const Coupon = require('./models/Coupon');
const Order = require('./models/Order');
const ChatRoom = require('./models/ChatRoom');
const Message = require('./models/Message');
const Shift = require('./models/Shift');

const seedDB = async () => {
  try {
    console.log('🔄 Đang kết nối tới cơ sở dữ liệu MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối cơ sở dữ liệu thành công!');

    // 1. Dọn dẹp cơ sở dữ liệu cũ
    console.log('🧹 Đang làm sạch các Collection cũ...');
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Store.deleteMany({});
    await User.deleteMany({});
    await Table.deleteMany({});
    await Coupon.deleteMany({});
    await Order.deleteMany({});
    await ChatRoom.deleteMany({});
    await Message.deleteMany({});
    await Shift.deleteMany({});
    console.log('✅ Đã dọn sạch cơ sở dữ liệu!');

    // 2. Nạp dữ liệu Stores
    console.log('📦 Đang nạp dữ liệu chi nhánh stores...');
    const storesData = [
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
    ];
    await Store.insertMany(storesData);

    // 3. Nạp dữ liệu Users (Tạo mã băm bcrypt thật cho "password123")
    console.log('👤 Đang mã hóa mật khẩu và nạp dữ liệu người dùng users...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const usersData = [
      {
        "_id": "u_admin_01",
        "name": "Lê Quốc Cường (Chủ Chuỗi)",
        "email": "cuong.admin@tiembanh.com",
        "password": passwordHash,
        "google_id": null,
        "role": "admin",
        "store_id": null,
        "is_active": true
      },
      {
        "_id": "u_staff_q1",
        "name": "Nguyễn Văn Thu ngân",
        "email": "thungan.q1@tiembanh.com",
        "password": passwordHash,
        "google_id": null,
        "role": "staff",
        "store_id": "store_Q1",
        "is_active": true
      },
      {
        "_id": "u_customer_01",
        "name": "Khách Hàng A (ĐK Thường)",
        "email": "khachhangA@gmail.com",
        "password": passwordHash,
        "google_id": null,
        "role": "user",
        "store_id": null,
        "is_active": true
      },
      {
        "_id": "u_customer_02",
        "name": "Khách Hàng B (Google Auth)",
        "email": "khachhangB_google@gmail.com",
        "password": null,
        "google_id": "114758392019485736251",
        "role": "user",
        "store_id": null,
        "is_active": true
      }
    ];
    await User.insertMany(usersData);

    // 4. Nạp dữ liệu Tables
    console.log('🪑 Đang nạp dữ liệu phòng bàn tables...');
    const tablesData = [
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
        "current_order_id": "order_pending_demo_01"
      },
      {
        "_id": "t_q1_b4",
        "store_id": "store_Q1",
        "table_number": "Bàn 04",
        "seating_capacity": 6,
        "status": "available",
        "current_order_id": null
      },
      {
        "_id": "t_q1_b5",
        "store_id": "store_Q1",
        "table_number": "Bàn 05",
        "seating_capacity": 2,
        "status": "available",
        "current_order_id": null
      },
      {
        "_id": "t_q1_b6",
        "store_id": "store_Q1",
        "table_number": "Bàn 06",
        "seating_capacity": 4,
        "status": "available",
        "current_order_id": null
      },
      {
        "_id": "t_q1_b7",
        "store_id": "store_Q1",
        "table_number": "Bàn 07",
        "seating_capacity": 4,
        "status": "available",
        "current_order_id": null
      },
      {
        "_id": "t_q1_b8",
        "store_id": "store_Q1",
        "table_number": "Bàn 08",
        "seating_capacity": 8,
        "status": "available",
        "current_order_id": null
      }
    ];
    await Table.insertMany(tablesData);

    // 5. Nạp dữ liệu Coupons
    console.log('🏷️ Đang nạp dữ liệu mã giảm giá coupons...');
    const couponsData = [
      {
        "_id": "cp_fixed_20k",
        "code": "TIEMBANH2026",
        "discount_type": "fixed",
        "discount_value": 20000,
        "min_order_value": 100000,
        "max_discount_amount": 20000,
        "start_date": new Date("2026-06-01"),
        "expiry_date": new Date("2026-12-31"),
        "usage_limit": 100,
        "used_count": 5,
        "used_by_users": ["u_customer_01"],
        "is_active": true
      },
      {
        "_id": "cp_percent_10",
        "code": "CAFEHE2026",
        "discount_type": "percentage",
        "discount_value": 10,
        "min_order_value": 50000,
        "max_discount_amount": 30000,
        "start_date": new Date("2026-06-01"),
        "expiry_date": new Date("2026-12-31"),
        "usage_limit": 200,
        "used_count": 0,
        "used_by_users": [],
        "is_active": true
      }
    ];
    await Coupon.insertMany(couponsData);

    // 6. Nạp dữ liệu Categories
    console.log('📂 Đang nạp dữ liệu danh mục categories...');
    const categoriesData = [
      { "_id": "cat_banhmi", "name": "Bánh mì", "slug": "banh-mi", "is_active": true },
      { "_id": "cat_donut", "name": "Donut", "slug": "donut", "is_active": true },
      { "_id": "cat_cake", "name": "Bánh kem", "slug": "banh-kem", "is_active": true },
      { "_id": "cat_tiramisu", "name": "Tiramisu", "slug": "tiramisu", "is_active": true },
      { "_id": "cat_coffee", "name": "Cà phê", "slug": "ca-phe", "is_active": true },
      { "_id": "cat_tea", "name": "Trà", "slug": "tra", "is_active": true }
    ];
    await Category.insertMany(categoriesData);

    // 7. Nạp dữ liệu Products (Đồng bộ song song cấu trúc thô & tinh tế để Frontend hoạt động ổn định)
    console.log('🍕 Đang nạp dữ liệu món ăn/nước uống products...');
    const rawProducts = [
      // BÁNH MÌ
      { "_id": "p_bm_1", "category_id": "cat_banhmi", "name": "Bánh mì thịt nướng", "slug": "banh-mi-thit-nuong", "image": "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500", "origin_price": 25000, "sale_price": 25000, "attributes": {}, "inventory": [{ "store_id": "store_Q1", "stock": 20, "is_available": true }] },
      { "_id": "p_bm_2", "category_id": "cat_banhmi", "name": "Bánh mì chả cá", "slug": "banh-mi-cha-ca", "image": "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500", "origin_price": 22000, "sale_price": 22000, "attributes": {}, "inventory": [{ "store_id": "store_Q1", "stock": 15, "is_available": true }] },
      { "_id": "p_bm_3", "category_id": "cat_banhmi", "name": "Bánh mì trứng ốp la", "slug": "banh-mi-trung-op-la", "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500", "origin_price": 20000, "sale_price": 20000, "attributes": {}, "inventory": [{ "store_id": "store_Q1", "stock": 30, "is_available": true }] },
      // DONUT
      { "_id": "p_donut_1", "category_id": "cat_donut", "name": "Donut socola", "slug": "donut-socola", "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500", "origin_price": 30000, "sale_price": 30000, "attributes": {}, "inventory": [{ "store_id": "store_Q1", "stock": 10, "is_available": true }] },
      { "_id": "p_donut_2", "category_id": "cat_donut", "name": "Donut dâu", "slug": "donut-dau", "image": "https://images.unsplash.com/photo-1612240498936-65f5101365d2?w=500", "origin_price": 30000, "sale_price": 30000, "attributes": {}, "inventory": [{ "store_id": "store_Q1", "stock": 10, "is_available": true }] },
      { "_id": "p_donut_3", "category_id": "cat_donut", "name": "Donut matcha", "slug": "donut-matcha", "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500", "origin_price": 32000, "sale_price": 32000, "attributes": {}, "inventory": [{ "store_id": "store_Q1", "stock": 8, "is_available": true }] },
      { "_id": "p_donut_4", "category_id": "cat_donut", "name": "Donut vani", "slug": "donut-vani", "image": "https://images.unsplash.com/photo-1612240498936-65f5101365d2?w=500", "origin_price": 28000, "sale_price": 28000, "attributes": {}, "inventory": [{ "store_id": "store_Q1", "stock": 12, "is_available": true }] },
      // CAKE
      { "_id": "p_cake_1", "category_id": "cat_cake", "name": "Bánh kem dâu", "slug": "banh-kem-dau", "image": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500", "origin_price": 180000, "sale_price": 180000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 50000 }] }, "inventory": [{ "store_id": "store_Q1", "stock": 5, "is_available": true }] },
      { "_id": "p_cake_2", "category_id": "cat_cake", "name": "Bánh kem socola", "slug": "banh-kem-socola", "image": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500", "origin_price": 190000, "sale_price": 190000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 50000 }] }, "inventory": [{ "store_id": "store_Q1", "stock": 4, "is_available": true }] },
      { "_id": "p_cake_3", "category_id": "cat_cake", "name": "Bánh kem matcha", "slug": "banh-kem-matcha", "image": "https://images.unsplash.com/photo-1536680465769-2365207b035e?w=500", "origin_price": 195000, "sale_price": 195000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 50000 }] }, "inventory": [{ "store_id": "store_Q1", "stock": 3, "is_available": true }] },
      { "_id": "p_cake_4", "category_id": "cat_cake", "name": "Bánh kem trái cây", "slug": "banh-kem-trai-cay", "image": "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=500", "origin_price": 200000, "sale_price": 200000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 50000 }] }, "inventory": [{ "store_id": "store_Q1", "stock": 5, "is_available": true }] },
      // TIRAMISU
      { "_id": "p_tira_1", "category_id": "cat_tiramisu", "name": "Tiramisu truyền thống", "slug": "tiramisu-truyen-thong", "image": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500", "origin_price": 55000, "sale_price": 55000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 10000 }] }, "inventory": [{ "store_id": "store_Q1", "stock": 15, "is_available": true }] },
      { "_id": "p_tira_2", "category_id": "cat_tiramisu", "name": "Tiramisu matcha", "slug": "tiramisu-matcha", "image": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500", "origin_price": 60000, "sale_price": 60000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 10000 }] }, "inventory": [{ "store_id": "store_Q1", "stock": 10, "is_available": true }] },
      { "_id": "p_tira_3", "category_id": "cat_tiramisu", "name": "Tiramisu dâu", "slug": "tiramisu-dau", "image": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500", "origin_price": 60000, "sale_price": 60000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 10000 }] }, "inventory": [{ "store_id": "store_Q1", "stock": 10, "is_available": true }] },
      { "_id": "p_tira_4", "category_id": "cat_tiramisu", "name": "Tiramisu cacao đậm", "slug": "tiramisu-cacao-dam", "image": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500", "origin_price": 65000, "sale_price": 65000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 10000 }] }, "inventory": [{ "store_id": "store_Q1", "stock": 12, "is_available": true }] },
      // COFFEE
      { "_id": "p_cf_1", "category_id": "cat_coffee", "name": "Cafe đen đá", "slug": "cafe-den-da", "image": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500", "origin_price": 20000, "sale_price": 20000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }], "ice_levels": ["100% Đá", "50% Đá", "Không Đá"], "sugar_levels": ["100% Đường", "50% Đường", "Không Đường"] }, "inventory": [{ "store_id": "store_Q1", "stock": 99, "is_available": true }] },
      { "_id": "p_cf_2", "category_id": "cat_coffee", "name": "Cafe sữa đá", "slug": "cafe-sua-da", "image": "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500", "origin_price": 25000, "sale_price": 25000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }], "ice_levels": ["100% Đá", "50% Đá", "Không Đá"], "sugar_levels": ["100% Đường", "50% Đường", "Không Đường"] }, "inventory": [{ "store_id": "store_Q1", "stock": 99, "is_available": true }] },
      { "_id": "p_cf_3", "category_id": "cat_coffee", "name": "Bạc xỉu", "slug": "bac-xiu", "image": "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500", "origin_price": 28000, "sale_price": 28000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }], "ice_levels": ["100% Đá", "50% Đá", "Không Đá"], "sugar_levels": ["100% Đường", "50% Đường", "Không Đường"] }, "inventory": [{ "store_id": "store_Q1", "stock": 99, "is_available": true }] },
      { "_id": "p_cf_4", "category_id": "cat_coffee", "name": "Latte", "slug": "latte", "image": "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500", "origin_price": 35000, "sale_price": 35000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 7000 }], "ice_levels": ["100% Đá", "Nóng"], "sugar_levels": ["100% Đường", "Ít Đường"] }, "inventory": [{ "store_id": "store_Q1", "stock": 99, "is_available": true }] },
      { "_id": "p_cf_5", "category_id": "cat_coffee", "name": "Cappuccino", "slug": "cappuccino", "image": "https://images.unsplash.com/photo-1534778101976-62847782c213?w=500", "origin_price": 35000, "sale_price": 35000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 7000 }], "ice_levels": ["100% Đá", "Nóng"] }, "inventory": [{ "store_id": "store_Q1", "stock": 99, "is_available": true }] },
      { "_id": "p_cf_6", "category_id": "cat_coffee", "name": "Americano", "slug": "americano", "image": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500", "origin_price": 30000, "sale_price": 30000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }], "ice_levels": ["100% Đá", "Đá Ít", "Nóng"] }, "inventory": [{ "store_id": "store_Q1", "stock": 99, "is_available": true }] },
      // TEA
      { "_id": "p_tea_1", "category_id": "cat_tea", "name": "Trà đào", "slug": "tra-dao", "image": "https://images.unsplash.com/photo-1556881286-fc6915169721?w=500", "origin_price": 30000, "sale_price": 30000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }], "ice_levels": ["100% Đá", "50% Đá"], "sugar_levels": ["100% Đường", "70% Đường"] }, "inventory": [{ "store_id": "store_Q1", "stock": 50, "is_available": true }] },
      { "_id": "p_tea_2", "category_id": "cat_tea", "name": "Trà chanh", "slug": "tra-chanh", "image": "https://images.unsplash.com/photo-1556881286-fc6915169721?w=500", "origin_price": 20000, "sale_price": 20000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }], "ice_levels": ["100% Đá", "50% Đá"] }, "inventory": [{ "store_id": "store_Q1", "stock": 60, "is_available": true }] },
      { "_id": "p_tea_3", "category_id": "cat_tea", "name": "Trà vải", "slug": "tra-vai", "image": "https://images.unsplash.com/photo-1556881286-fc6915169721?w=500", "origin_price": 32000, "sale_price": 32000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 5000 }], "ice_levels": ["100% Đá", "50% Đá"] }, "inventory": [{ "store_id": "store_Q1", "stock": 40, "is_available": true }] },
      { "_id": "p_tea_4", "category_id": "cat_tea", "name": "Trà sen vàng", "slug": "tra-sen-vang", "image": "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=500", "origin_price": 35000, "sale_price": 35000, "attributes": { "sizes": [{ "size": "M", "extra_price": 0 }, { "size": "L", "extra_price": 7000 }], "ice_levels": ["100% Đá", "50% Đá"], "sugar_levels": ["100% Đường", "70% Đường"] }, "inventory": [{ "store_id": "store_Q1", "stock": 35, "is_available": true }] }
    ];

    const productsToInsert = rawProducts.map(p => {
      // Xác định category ('cake' hoặc 'drink') dựa trên category_id
      const isCake = ['cat_banhmi', 'cat_donut', 'cat_cake', 'cat_tiramisu'].includes(p.category_id);
      return {
        _id: p._id,
        category_id: p.category_id,
        name: p.name,
        slug: p.slug,
        image_url: p.image,
        price: p.sale_price, // Gán giá trị sale_price vào trường price cũ
        origin_price: p.origin_price,
        sale_price: p.sale_price,
        category: isCake ? 'cake' : 'drink',
        attributes: p.attributes,
        inventory: p.inventory,
        status: 'selling'
      };
    });

    await Product.insertMany(productsToInsert);

    // 8. Nạp dữ liệu Orders
    console.log('🛒 Đang nạp dữ liệu hóa đơn orders...');
    const ordersData = [
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
            "item_status": "cooking"
          }
        ],
        "sub_total": 90000,
        "discount_amount": 0,
        "final_total": 90000,
        "status": "serving",
        "payment_status": "unpaid",
        "createdAt": new Date()
      }
    ];
    await Order.insertMany(ordersData);

    // 9. Nạp dữ liệu Chat Rooms & Messages
    console.log('💬 Đang nạp dữ liệu phòng chat chat_rooms...');
    const chatRoomsData = [
      {
        "_id": "room_ai_u_admin_01",
        "customer_id": "u_admin_01",
        "user_role": "admin",
        "is_ai_room": true,
        "last_message": "Công thức pha Cafe sữa đá là gì?",
        "updatedAt": "2026-06-21T03:30:00Z"
      },
      {
        "_id": "room_customer_01",
        "customer_id": "u_customer_01",
        "user_role": "user",
        "is_ai_room": false,
        "last_message": "Shop ơi, bánh kem dâu size L có sẵn ở chi nhánh Q1 không?",
        "updatedAt": new Date()
      }
    ];
    await ChatRoom.insertMany(chatRoomsData);

    console.log('✉️ Đang nạp dữ liệu tin nhắn messages...');
    const messagesData = [
      {
        "_id": "m_001",
        "room_id": "room_customer_01",
        "sender_id": "u_customer_01",
        "sender_type": "user",
        "message_text": "Shop ơi, bánh kem dâu size L có sẵn ở chi nhánh Q1 không?",
        "is_read": false,
        "createdAt": new Date()
      }
    ];
    await Message.insertMany(messagesData);

    // 10. Nạp dữ liệu Shifts (Ca trực)
    console.log('🏁 Đang nạp dữ liệu ca trực shifts...');
    const shiftsData = [
      {
        "_id": "shift_demo_q1_01",
        "store_id": "store_Q1",
        "staff_id": "u_staff_q1",
        "status": "closed",
        "opening_cash": 500000,
        "system_cash_collected": 1200000,
        "system_banking_collected": 800000,
        "closing_cash_actual": 1700000,
        "difference": 0,
        "total_bills_completed": 25,
        "total_bills_cancelled": 2,
        "note": "Hủy 2 bill do nhân viên ca trước bấm nhầm số bàn. Tiền két khớp.",
        "end_time": new Date("2026-06-20T14:00:00Z"),
        "createdAt": new Date("2026-06-20T07:00:00Z")
      }
    ];
    await Shift.insertMany(shiftsData);

    console.log('🎉 QUÁ TRÌNH SEED DỮ LIỆU ĐÃ HOÀN THÀNH THÀNH CÔNG HỰC RỠ!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi xảy ra khi chạy Seed DB:', error);
    process.exit(1);
  }
};

seedDB();
