const mongoose = require('mongoose');

/**
 * Schema Thông Báo Hệ Thống Dành Cho Khách Hàng (Notifications)
 * Dùng để phát thông báo thời gian thực khi bếp nhận đơn, báo xong món, hoặc khuyến mãi
 */
const notificationSchema = new mongoose.Schema({
  _id: { type: String, default: () => 'noti_' + new mongoose.Types.ObjectId().toString() },
  user_id: {
    type: String,
    required: [true, 'Mã ID người nhận thông báo là bắt buộc']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['order_status', 'promotion', 'system'],
    default: 'order_status'
  },
  is_read: {
    type: Boolean,
    default: false
  },
  order_id: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
