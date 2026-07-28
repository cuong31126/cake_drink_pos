const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

/**
 * @desc    Khởi tạo phòng chat tư vấn mới (AI hoặc người thật)
 * @route   POST /api/v1/chats/rooms
 * @access  Private (Đã đăng nhập)
 */
const createChatRoom = async (req, res, next) => {
  try {
    const { is_ai_room } = req.body;
    
    let room = await ChatRoom.findOne({ 
      customer_id: req.user._id.toString(), 
      is_ai_room: is_ai_room || false 
    });

    if (!room) {
      room = await ChatRoom.create({
        customer_id: req.user._id.toString(),
        user_role: req.user.role,
        is_ai_room: is_ai_room || false,
        last_message: ""
      });
    }

    res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy danh sách các phòng chat
 * @route   GET /api/v1/chats/rooms
 * @access  Private (Staff/Admin)
 */
const getChatRooms = async (req, res, next) => {
  try {
    let rooms;
    if (req.user.role === 'user') {
      // Khách hàng chỉ xem phòng chat của chính mình
      rooms = await ChatRoom.find({ customer_id: req.user._id.toString() }).sort({ updatedAt: -1 });
    } else {
      // Nhân viên và Admin xem tất cả phòng của khách (is_ai_room: false) và phòng AI riêng của mình
      rooms = await ChatRoom.find({
        $or: [
          { is_ai_room: false },
          { customer_id: req.user._id.toString(), is_ai_room: true }
        ]
      }).sort({ updatedAt: -1 });
    }

    res.status(200).json({
      success: true,
      data: rooms
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy lịch sử tin nhắn trong phòng chat
 * @route   GET /api/v1/chats/rooms/:id/messages
 * @access  Private (Đã đăng nhập)
 */
const getRoomMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ room_id: req.params.id }).sort({ createdAt: 1 });
    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Gửi tin nhắn mới vào phòng chat
 * @route   POST /api/v1/chats/rooms/:id/messages
 * @access  Private (Đã đăng nhập)
 */
const sendRoomMessage = async (req, res, next) => {
  try {
    const { message_text } = req.body;
    const message = await Message.create({
      _id: 'm_' + Date.now(),
      room_id: req.params.id,
      sender_id: req.user._id.toString(),
      sender_type: req.user.role === 'user' ? 'user' : 'staff',
      message_text: message_text.trim(),
      is_read: false
    });

    await ChatRoom.findByIdAndUpdate(req.params.id, { 
      last_message: message_text.trim() 
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createChatRoom,
  getChatRooms,
  getRoomMessages,
  sendRoomMessage
};
