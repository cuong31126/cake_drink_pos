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
 * Sub-schema chuyên biệt lưu vết lịch sử xóa/giảm món
 */
const cancelledItemSchema = new mongoose.Schema({
  product_id: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  reason: { type: String, default: 'Khách đổi ý' },
  updated_by: { 
    type: String, 
    required: true
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
  customer_id: {
    type: String,
    default: null
  },
  table_id: {
    type: String,
    default: null 
  },
  created_by: {
    type: String,
    required: [true, 'ID nhân viên / người lập đơn là bắt buộc']
  },
  order_type: {
    type: String,
    enum: ['dine-in', 'take-away', 'delivery'],
    required: true
  },
  delivery_address: {
    type: String,
    default: ""
  },
  customer_phone: {
    type: String,
    default: ""
  },
  items: [orderItemSchema],
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
    enum: ['pending_confirm', 'serving', 'ready', 'completed', 'cancelled'],
    default: 'pending_confirm'
  },
  payment_status: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid'
  },
  payment_method: {
    type: String,
    enum: ['cash', 'payos', 'momo', 'bank', 'unspecified'],
    default: 'cash'
  },
  is_confirmed: {
    type: Boolean,
    default: false
  },
  payos_order_code: {
    type: Number,
    default: null
  },
  note: {
    type: String,
    default: ""
  },
  is_flagged: {
    type: Boolean,
    default: false
  },
  flag_reason: {
    type: String,
    default: ""
  },
  cancelled_items: [cancelledItemSchema]
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;