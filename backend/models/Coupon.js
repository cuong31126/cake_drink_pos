const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discount_value: { type: Number, required: true }, // Số tiền hoặc số % được giảm
  is_active: { type: Boolean, default: true },
  expiry_date: { type: Date, required: true }, // Hạn dùng
  
  // Mở rộng thêm từ file khởi tạo
  discount_type: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
  min_order_value: { type: Number, default: 0 },
  max_discount_amount: { type: Number, default: 0 },
  start_date: { type: Date },
  usage_limit: { type: Number, default: 100 },
  used_count: { type: Number, default: 0 },
  used_by_users: { type: [String], default: [] }
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;