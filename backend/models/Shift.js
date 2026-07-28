const mongoose = require('mongoose');

/**
 * Schema cấu trúc quản lý Ca Trực và Đối Soát Két Tiền Mặt (Shifts)
 * Sử dụng chốt số liệu điểm bán, kiểm soát chênh lệch tài chính cuối ngày
 */
const shiftSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  store_id: {
    type: String,
    required: [true, 'Bắt buộc phải chỉ định mã chi nhánh của ca trực']
  },
  staff_id: {
    type: String,
    required: [true, 'ID nhân viên phụ trách ca trực trực tiếp là bắt buộc']
  },
  start_time: {
    type: Date,
    default: Date.now,
    required: true
  },
  end_time: {
    type: Date,
    // Sẽ mang giá trị null trong suốt thời gian ca đang vận hành chạy ngầm
    default: null 
  },
  opening_cash: {
    type: Number,
    required: [true, 'Số tiền mặt thối có sẵn trong két bàn giao đầu ca là bắt buộc'],
    default: 0
  },
  system_cash_collected: {
    type: Number,
    required: true,
    default: 0 // Tổng tiền mặt thu được từ các đơn hàng hoàn thành thành công trong ca (Máy POS tự tính)
  },
  system_banking_collected: {
    type: Number,
    required: true,
    default: 0 // Tổng tiền thu được qua quét mã QR PayOS/Chuyển khoản ngân hàng trong ca
  },
  closing_cash_actual: {
    type: Number,
    required: true,
    default: 0 // Tiền mặt thực tế đếm bằng tay trong két sắt khi kết ca bàn giao lại
  },
  difference: {
    type: Number,
    required: true,
    default: 0 // Chênh lệch tiền = closing_cash_actual - (opening_cash + system_cash_collected)
  },
  total_bills_completed: {
    type: Number,
    default: 0 // Tổng số hóa đơn hoàn thành kinh doanh trong ca
  },
  total_bills_cancelled: {
    type: Number,
    default: 0 // Tổng số hóa đơn bị hủy/lập nhầm trong ca (Dùng để Admin kiểm tra chéo)
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  note: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

const Shift = mongoose.model('Shift', shiftSchema);
module.exports = Shift;