const mongoose = require('mongoose');

/**
 * Schema quản lý Sơ đồ Phòng Bàn (Tables) tại các chi nhánh
 */
const tableSchema = new mongoose.Schema({

  _id : {
    type : String , 
    required : true
  },
  store_id: {
    type: String,
    required: [true, 'Mã chi nhánh quản lý bàn bắt buộc phải có']
  },
  table_number: {
    type: String,
    required: [true, 'Số danh định bàn (Ví dụ: Bàn 01) là bắt buộc']
  },
  seating_capacity: {
    type: Number,
    default: 4
  },
  status: {
    type: String,
    enum: ['available', 'occupied'],
    default: 'available' // Mặc định bàn trống màu xanh
  },
  current_order_id: {
    type: String,
    // Găm giữ ID của đơn hàng chưa thanh toán đang ngồi tại bàn này. Khi tính tiền xong sẽ chuyển về null.
    default: null
  }
}, {
  timestamps: true
});

const Table = mongoose.model('Table', tableSchema);
module.exports = Table;