const mongoose = require('mongoose');

/**
 * Schema cấu trúc chi tiết một bản ghi Tin Nhắn độc lập (Messages)
 * Quản lý lịch sử chat giữa Khách hàng, Nhân viên, và Trợ lý AI nội bộ
 */
const messageSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  room_id: {
    type: String,
    required: [true, 'Tin nhắn bắt buộc phải thuộc về một phòng chat (room_id)']
  },
  sender_id: {
    type: String,
    required: [true, 'ID người gửi tin nhắn là bắt buộc']
  },
  sender_type: {
    type: String,
    enum: ['user', 'staff', 'bot', 'system'],
    required: [true, 'Loại người gửi (user/staff/bot/system) là bắt buộc']
  },
  message_text: {
    type: String,
    required: [true, 'Nội dung văn bản tin nhắn không được để trống'],
    trim: true
  },
  is_read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Tự động sinh trường createdAt và updatedAt cho từng tin nhắn
});

// Xây dựng index tăng tốc độ truy vấn tìm kiếm tin nhắn theo phòng chat và thời gian
messageSchema.index({ room_id: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;