const mongoose = require('mongoose');

/**
 * Sub-schema cấu trúc chi tiết một dòng Tin Nhắn (Messages) trong phòng chat
 */
const messageSchema = new mongoose.Schema({
  sender_id: {
    type: String,
    required: true
  },
  sender_type: {
    type: String,
    enum: ['user', 'staff', 'bot', 'system'],
    required: true
  },
  message_text: {
    type: String,
    required: true
  },
  is_read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Schema cấu trúc Phòng Chat (ChatRooms)
 * Hỗ trợ bóc tách độc lập giữa phòng liên hệ người thật và Phòng tương tác trợ lý AI
 */
const chatRoomSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  customer_id: {
    type: String,
    required: [true, 'ID người tham gia khởi tạo phòng chat là bắt buộc']
  },
  user_role: {
    type: String,
    enum: ['admin', 'staff', 'user'],
    required: true // Dùng để Backend lọc dữ liệu ngữ cảnh (Context) nạp vào AI chính xác
  },
  is_ai_room: {
    type: Boolean,
    default: false // true = Phòng chat hỏi đáp AI nội bộ cố định, false = Phòng chat với khách
  },
  last_message: {
    type: String,
    default: ""
  },
  is_resolved: {
    type: Boolean,
    default: false // Dùng riêng cho Staff lọc xem phòng nào của khách đã được giải quyết xong xuôi
  },
  messages: [messageSchema] // Nhúng trực tiếp mảng tin nhắn vào trong phòng chat để tối ưu tốc độ đọc
}, {
  timestamps: true
});

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
module.exports = ChatRoom;