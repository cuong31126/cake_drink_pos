const mongoose = require('mongoose');

/**
 * Sub-schema dành riêng cho các món ăn đang được phục vụ
 */
const orderItemSchema = new mongoose.Schema({
  product_id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Số lượng tối thiểu là 1']
  },
  selected_attributes: {
    // Lưu trữ cấu hình kích cỡ, mức đường, mức đá dạng object linh hoạt
    type: Object,
    default: {}
  },
  item_status: {
    type: String,
    enum: ['cooking', 'served'],
    default: 'cooking'
  }
});

/**
 * Sub-schema chuyên biệt lưu vết lịch sử xóa/giảm món (Giải pháp C chống gian lận tài chính)
 */
const cancelledItemSchema = new mongoose.Schema({
  product_id: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true }, // Số lượng bị cắt giảm hoặc xóa hẳn
  reason: { type: String, default: 'Khách đổi ý' },
  updated_by: { 
    type: String, 
    required: true // Ghi nhận ID của người có thẩm quyền phê duyệt lệnh hủy (Admin/Manager - Giải pháp A)
  },
  cancelled_at: {
    type: Date,
    default: Date.now
  }
});

/**
 * Schema cấu trúc Đơn Hàng (Orders) tổng thể
 */
const orderSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  store_id: {
    type: String,
    required: [true, 'Mã chi nhánh cửa hàng là bắt buộc']
  },
  table_id: {
    type: String,
    // Có thể null đối với trường hợp đơn mang đi (take-away) hoặc đơn giao hàng (delivery)
    default: null 
  },
  created_by: {
    type: String,
    required: [true, 'ID nhân viên lập đơn là bắt buộc']
  },
  order_type: {
    type: String,
    enum: ['dine-in', 'take-away', 'delivery'],
    required: true
  },
  items: [orderItemSchema], // Mảng danh sách các món ăn hiện tại
  sub_total: {
    type: Number,
    required: true,
    default: 0
  },
  discount_amount: {
    type: Number,
    required: true,
    default: 0
  },
  final_total: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['serving', 'completed', 'cancelled'],
    default: 'serving'
  },
  payment_status: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid'
  },
  // Mảng lưu vết nhật ký chống thất thoát tiền
  cancelled_items: [cancelledItemSchema]
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;