const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * @desc    Khởi tạo hoặc tìm kiếm phòng chat tư vấn (AI hoặc người thật)
 * @route   POST /api/v1/chats/rooms
 * @access  Private (Đã đăng nhập)
 */
const createChatRoom = async (req, res, next) => {
  try {
    const { is_ai_room, customer_id } = req.body;
    let userId = req.user._id.toString();

    // Nếu Nhân viên/Admin chủ động chọn tạo phòng cho một khách hàng chỉ định
    if (req.user.role !== 'user' && customer_id) {
      userId = customer_id.toString();
    }
    
    let room = await ChatRoom.findOne({ 
      customer_id: userId, 
      is_ai_room: is_ai_room || false 
    });

    if (!room) {
      room = await ChatRoom.create({
        customer_id: userId,
        user_role: (req.user.role !== 'user' && customer_id) ? 'user' : req.user.role,
        is_ai_room: is_ai_room || false,
        last_message: ""
      });
    }

    const userObj = await User.findById(userId).select('name email role');
    const roomObj = room.toObject ? room.toObject() : room;
    roomObj.customer_name = userObj ? (userObj.name || userObj.email) : `Khách #${userId.slice(-4).toUpperCase()}`;

    res.status(201).json({
      success: true,
      data: roomObj
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy danh sách các phòng chat độc lập của từng khách hàng
 * @route   GET /api/v1/chats/rooms
 * @access  Private (Staff/Admin/User)
 */
const getChatRooms = async (req, res, next) => {
  try {
    let rooms;
    if (req.user.role === 'user') {
      // Khách hàng chỉ xem phòng chat của chính mình
      rooms = await ChatRoom.find({ customer_id: req.user._id.toString() }).sort({ updatedAt: -1 }).lean();
    } else {
      // Nhân viên và Admin xem tất cả phòng của từng khách (is_ai_room: false) và phòng AI riêng của mình
      rooms = await ChatRoom.find({
        $or: [
          { is_ai_room: false },
          { customer_id: req.user._id.toString(), is_ai_room: true }
        ]
      }).sort({ updatedAt: -1 }).lean();
    }

    // 💡 KHẮC PHỤC TRIỆT ĐỂ: Lọc trùng lặp phòng chat của từng Khách Hàng (Tách biệt 100% phòng chat từng User)
    const seenCustomers = new Set();
    const uniqueRooms = [];
    
    rooms.forEach(r => {
      if (r.is_ai_room) {
        uniqueRooms.push(r);
      } else if (!seenCustomers.has(r.customer_id)) {
        seenCustomers.add(r.customer_id);
        uniqueRooms.push(r);
      }
    });

    // Đính kèm thông tin tên người dùng thực tế từ Model User
    const customerIds = uniqueRooms.map(r => r.customer_id);
    const users = await User.find({ _id: { $in: customerIds } }).select('_id name email role');
    const userMap = {};
    users.forEach(u => { 
      userMap[u._id.toString()] = u.name || u.email; 
    });

    const enrichedRooms = uniqueRooms.map(r => ({
      ...r,
      customer_name: userMap[r.customer_id] || `Khách #${r.customer_id.slice(-4).toUpperCase()}`
    }));

    res.status(200).json({
      success: true,
      data: enrichedRooms
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
    const roomId = req.params.id;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      res.status(404);
      throw new Error('Không tìm thấy phòng chat chỉ định.');
    }

    const message = await Message.create({
      _id: 'm_' + Date.now(),
      room_id: roomId,
      sender_id: req.user._id.toString(),
      sender_type: req.user.role === 'user' ? 'user' : 'staff',
      message_text: message_text.trim(),
      is_read: false
    });

    // Cập nhật lại thông tin phòng chat
    room.last_message = message_text.trim();
    room.updatedAt = new Date();
    await room.save();

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
