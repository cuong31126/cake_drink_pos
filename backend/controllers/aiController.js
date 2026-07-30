const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const fs = require('fs');
const path = require('path');

/* 
=========================================================================
🚫 NGIÊM CẤM GỌI API GEMINI VÀ CÁC DỊCH VỤ CỦA GOOGLE AI STUDIO
TOÀN BỘ PHẦN KHỞI TẠO VÀ GỌI API BÊN NGOÀI ĐÃ ĐƯỢC CHUYỂN THÀNH COMMENT:

// const { GoogleGenerativeAI } = require('@google/generative-ai'); 
// const getAPIKeysPool = () => {
//   const keysStr = `${process.env.GEMINI_KEYS || ''},${process.env.GEMINI_KEY || ''}`;
//   return keysStr.split(',').map(k => k.trim()).filter(Boolean);
// };
=========================================================================
*/

// =========================================================================
// 🚀 TRỢ LÝ TỰ ĐỘNG NỘI BỘ (CHẠY 100% OFFLINE LOCAL - KHÔNG TIÊU TỐN API KEY)
// =========================================================================
const matchLocalBotResponse = (query, role = 'user') => {
  const q = query.toLowerCase().trim();

  // A. Câu hỏi dành cho Khách Hàng (User)
  if (role === 'user') {
    if (q.includes('giờ mở') || q.includes('mấy giờ') || q.includes('đóng cửa') || q.includes('thời gian')) {
      return "Dạ tiệm bánh mở cửa phục vụ từ 07:00 - 22:30 hàng ngày (kể cả Thứ 7, Chủ Nhật và các ngày Lễ) nhé! 🍰";
    }
    if (q.includes('địa chỉ') || q.includes('chi nhánh') || q.includes('ở đâu') || q.includes('quán ở đâu') || q.includes('vị trí')) {
      return "Dạ hệ thống cửa hàng hiện tại có 2 chi nhánh:\n📍 Chi nhánh 1: 123 Đường Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM\n📍 Chi nhánh 2: 456 Đường Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM 🏪";
    }
    if (q.includes('hotline') || q.includes('sđt') || q.includes('số điện thoại') || q.includes('liên hệ') || q.includes('gọi')) {
      return "Dạ Hotline hỗ trợ & đặt bánh tiệc của tiệm là: 1900 8888 (Trực từ 07:00 - 22:30 hàng ngày) ạ! ☎️";
    }
    if (q.includes('thanh toán') || q.includes('chuyển khoản') || q.includes('mã qr') || q.includes('payos') || q.includes('thẻ')) {
      return "Dạ tiệm hỗ trợ thanh toán Tiền mặt trực tiếp, Quét mã QR Chuyển khoản ngân hàng tự động (PayOS/MBBank) và Thẻ rất nhanh chóng ạ! 💳";
    }
    if (q.includes('món hot') || q.includes('best seller') || q.includes('ngon nhất') || q.includes('bánh gì') || q.includes('gợi ý')) {
      return "Dạ các món Best Seller được yêu thích nhất tại tiệm gồm có:\n🍰 Bánh ngọt: Tiramisu Cảo, Croissant Bơ Thụy Sĩ, Cake Matcha Phô Mai.\n🥤 Thức uống: Trà Sữa Kem Trứng Nướng, Cà Phê Muối Cháy, Trà Trái Cây Tươi nhé! 🌟";
    }
    if (q.includes('đặt món') || q.includes('mua hàng') || q.includes('giao hàng') || q.includes('ship')) {
      return "Dạ quý khách có thể bấm vào nút '+ Đặt thực đơn mới' ở góc trên để chọn món & đặt giao hàng/mang đi dễ dàng nhé! 🛵";
    }
  }

  // B. Câu hỏi dành cho Nhân Viên / Admin (Staff)
  if (role !== 'user') {
    if (q.includes('kết ca') || q.includes('đóng két') || q.includes('chốt ca') || q.includes('giao ca')) {
      return "📋 Quy trình Kết ca & Đóng két dành cho Thu ngân:\n1. Kiểm tra tất cả các đơn hàng trên POS đã hoàn thành ('completed').\n2. Đếm tiền mặt thực tế trong két.\n3. So sánh với số dư hệ thống trên tab Quản lý Hóa đơn.\n4. Bấm 'Báo cáo kết ca' và niêm phong túi tiền.";
    }
    if (q.includes('hủy món') || q.includes('đổi món') || q.includes('sửa đơn')) {
      return "ℹ️ Để hủy hoặc sửa món cho khách hàng: Vào tab 'Hàng đợi phục vụ' (/queue) hoặc 'Quản lý Hóa đơn' (/bills) để thao tác nhé!";
    }
  }

  // C. Phản hồi mặc định nếu từ khóa nằm ngoài danh sách
  return role === 'user'
    ? "Dạ cảm ơn câu hỏi của bạn! Trợ lý tự động của tiệm đã ghi nhận. Nếu bạn cần hỗ trợ thêm thông tin chi tiết, vui lòng chuyển qua kênh 'Hỗ trợ viên trực quầy' ở cột bên trái để nhắn tin trực tiếp với Nhân viên nhé! 🍰"
    : "ℹ️ Trợ lý tự động nội bộ: Câu hỏi của bạn chưa nằm trong danh mục tra cứu nhanh. Vui lòng liên hệ Admin hoặc Quản lý chi nhánh để được giải đáp!";
};

/**
 * @desc    Gửi câu hỏi tới Trợ lý tự động nội bộ (Phòng chat AI) - 100% Offline, Không gọi API bên ngoài
 * @route   POST /api/v1/ai/chat-assistant
 * @access  Private (Mọi người dùng đã đăng nhập hệ thống)
 */
const handleAIChatAssistant = async (req, res, next) => {
  try {
    const { room_id, message_text } = req.body;

    // 1. Kiểm tra sự tồn tại của phòng chat AI
    const room = await ChatRoom.findById(room_id);
    if (!room || !room.is_ai_room) {
      res.status(400);
      throw new Error('Yêu cầu không hợp lệ. Mã ID phòng chat không phải là phòng tương tác Trợ lý.');
    }

    // 2. Lưu tin nhắn câu hỏi của Người dùng vào cơ sở dữ liệu trước
    const userMessage = await Message.create({
      room_id: room._id,
      sender_id: req.user._id.toString(),
      sender_type: req.user.role === 'user' ? 'user' : 'staff',
      message_text: message_text.trim()
    });
    
    room.messages.push(userMessage);
    room.last_message = message_text.trim();
    await room.save();

    /*
    =========================================================================
    🚫 ĐÃ KHÓA / COMMENT TOÀN BỘ CODE GỌI API GEMINI & GOOGLE AI STUDIO:

    // const apiKeys = getAPIKeysPool();
    // const aiClient = new GoogleGenerativeAI(activeKey);
    // const model = aiClient.getGenerativeModel({ model: candidateModel });
    // const result = await model.generateContent(historyPrompt);
    // aiResponseText = result.response.text();
    =========================================================================
    */

    // 3. Xử lý phản hồi tự động 100% Nội bộ / Local Offline
    const botResponseText = matchLocalBotResponse(message_text, room.user_role);

    // 4. Lưu tin nhắn phản hồi của Trợ lý Bot vào cơ sở dữ liệu
    const aiMessage = await Message.create({
      room_id: room._id,
      sender_id: 'system_bot_ai',
      sender_type: 'bot',
      message_text: botResponseText.trim(),
      is_read: true
    });

    room.messages.push(aiMessage);
    room.last_message = botResponseText.trim();
    await room.save();

    // 5. Trả kết quả về cho Frontend hiển thị ngay lập tức
    res.status(200).json({
      success: true,
      data: aiMessage
    });

  } catch (error) {
    next(error);
  }
};

module.exports = { handleAIChatAssistant };