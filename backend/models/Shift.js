const mongoose = require('mongoose');

/**
 * Schema cấu trúc quản lý Ca Trực và Đối Soát Két Tiền Mặt (Shifts)
 * Sử dụng chốt số liệu điểm bán, kiểm soát chênh lệch tài chính cuối ngày
 */
const shiftSchema = new mongoose.Schema({
  _id: { type: String, default: () => 'shift_' + new mongoose.Types.ObjectId().toString() },
  store_id: {
    type: String,
    required: [true, 'Bắt buộc phải chỉ định mã chi nhánh của ca trực']
  },
  staff_id: {
    type: String,
    required: [true, 'ID nhân viên phụ trách ca trực trực tiếp là bắt buộc']
  },
  staff_name: {
    type: String,
    default: ''
  },
  start_time: {
    type: Date,
    default: Date.now,
    required: true
  },
  end_time: {
    type: Date,
    default: null 
  },
  opening_cash: {
    type: Number,
    required: [true, 'Số tiền mặt thối có sẵn trong két bàn giao đầu ca là bắt buộc'],
    default: 500000
  },
  system_cash_collected: {
    type: Number,
    required: true,
    default: 0
  },
  system_banking_collected: {
    type: Number,
    required: true,
    default: 0
  },
  closing_cash_actual: {
    type: Number,
    required: true,
    default: 0
  },
  difference: {
    type: Number,
    required: true,
    default: 0
  },
  total_bills_completed: {
    type: Number,
    default: 0
  },
  total_bills_cancelled: {
    type: Number,
    default: 0
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