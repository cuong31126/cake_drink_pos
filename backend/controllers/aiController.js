const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const GoogleGenAIModule = require('@google/generative-ai'); 
const fs = require('fs');
const path = require('path');

const aiKey = process.env.GEMINI_KEY;
let ai = null;

if (aiKey) {
  // 💡 GIẢI PHÁP MỚI: Dò tìm trực tiếp trên Module mà không qua biến trung gian, loại bỏ hoàn toàn ReferenceError
  if (GoogleGenAIModule.GoogleGenerativeAI) {
    ai = new GoogleGenAIModule.GoogleGenerativeAI(aiKey);
  } else if (GoogleGenAIModule.GoogleGenAI) {
    ai = new GoogleGenAIModule.GoogleGenAI({ apiKey: aiKey });
  } else {
    ai = new GoogleGenAIModule(aiKey);
  }
}

/**
 * @desc    Gửi câu hỏi tới Trợ lý AI nội bộ (Phòng chat AI độc lập cố định bên trái)
 * @route   POST /api/v1/ai/chat-assistant
 * ... Giữ nguyên toàn bộ phần code xử lý handleAIChatAssistant phía dưới của bạn ...
 */
/**
 * @desc    Gửi câu hỏi tới Trợ lý AI nội bộ (Phòng chat AI độc lập cố định bên trái)
 * @route   POST /api/v1/ai/chat-assistant
 * @access  Private (Mọi người dùng đã đăng nhập hệ thống)
 */
const handleAIChatAssistant = async (req, res, next) => {
  try {
    const { room_id, message_text } = req.body;

    if (!ai) {
      res.status(500);
      throw new Error('Tính năng AI hiện chưa được cấu hình khóa GEMINI_KEY trong file môi trường Backend.');
    }

    // 1. Kiểm tra sự tồn tại của phòng chat AI
    const room = await ChatRoom.findById(room_id);
    if (!room || !room.is_ai_room) {
      res.status(400);
      throw new Error('Yêu cầu không hợp lệ. Mã ID phòng chat không phải là phòng tương tác AI.');
    }

    // 2. Lưu tin nhắn câu hỏi của Người dùng vào cơ sở dữ liệu trước
    const userMessage = await Message.create({
      room_id: room._id,
      sender_id: req.user._id.toString(),
      sender_type: req.user.role === 'user' ? 'user' : 'staff',
      message_text: message_text.trim()
    });
    
    // Đẩy vào mảng nhúng của ChatRoom để đồng bộ dữ liệu đọc nhanh
    room.messages.push(userMessage);
    room.last_message = message_text.trim();
    await room.save();

    // 3. Đọc dữ liệu kiến thức (Knowledge Base) tương ứng với vai trò (Role) của tài khoản
    let knowledgeData = '';
    let systemPrompt = '';

    try {
      if (room.user_role === 'user') {
        // Khách hàng mua online: Chỉ đọc tài liệu về Thực đơn, Giá cả, Giờ hoạt động
        const filePath = path.join(__dirname, '../constants/ai_knowledge_user.md');
        knowledgeData = fs.readFileSync(filePath, 'utf8');
        systemPrompt = `Bạn là trợ lý ảo phục vụ khách hàng của Tiệm Bánh & Nước. Hãy dựa vào tài liệu cửa hàng sau để trả lời khách ngắn gọn, lịch sự: \n${knowledgeData}`;
      } else {
        // Nhân viên/Admin: Được phép đọc thêm tài liệu nghiệp vụ công thức, quy trình giao ca nội bộ
        const filePath = path.join(__dirname, '../constants/ai_knowledge_staff.md');
        knowledgeData = fs.readFileSync(filePath, 'utf8');
        systemPrompt = `Bạn là cố vấn nghiệp vụ nội bộ dành cho nhân viên của Tiệm Bánh & Nước. Hãy dựa vào quy trình sau để hướng dẫn nhân viên xử lý chính xác: \n${knowledgeData}`;
      }
    } catch (fileError) {
      console.warn(`[AI Warning] Không thể đọc file dữ liệu tri thức tĩnh: ${fileError.message}. Sử dụng Prompt mặc định.`);
      systemPrompt = "Bạn là trợ lý ảo hỗ trợ thông tin cho chuỗi cửa hàng Tiệm Bánh & Nước.";
    }

    // 4. Gọi mô hình xử lý sinh văn bản của Gemini (Sử dụng dòng mô hình gemini-1.5-flash tốc độ cao)
    const model = ai.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt // Đóng gói chỉ thị hệ thống bảo mật ngữ cảnh
    });

    // Lấy ra lịch sử 5 tin nhắn gần nhất trong phòng chat để AI hiểu ngữ cảnh cuộc hội thoại trước đó
    const contextMessages = await Message.find({ room_id: room._id })
      .sort({ createdAt: -1 })
      .limit(5);
    
    let historyPrompt = "Lịch sử hội thoại gần đây:\n";
    contextMessages.reverse().forEach(msg => {
      historyPrompt += `${msg.sender_type}: ${msg.message_text}\n`;
    });
    historyPrompt += `Câu hỏi mới nhất cần trả lời: ${message_text}`;

    const result = await model.generateContent(historyPrompt);
    const aiResponseText = result.response.text();

    // 5. Lưu tin nhắn phản hồi của Trợ lý AI vào cơ sở dữ liệu
    const aiMessage = await Message.create({
      room_id: room._id,
      sender_id: 'system_bot_ai',
      sender_type: 'bot',
      message_text: aiResponseText.trim(),
      is_read: true
    });

    // Cập nhật lại trạng thái phòng chat tổng thể
    room.messages.push(aiMessage);
    room.last_message = aiResponseText.trim();
    await room.save();

    // 6. Phản hồi dữ liệu về cho Client (Frontend nhận được sẽ render ngay lập tức)
    res.status(200).json({
      success: true,
      data: aiMessage
    });

  // 💡 ĐÃ SỬA: Bổ sung khối bắt lỗi tập trung và xuất hàm (Export) ra ngoài
  } catch (error) {
    next(error);
  }
};

module.exports = { handleAIChatAssistant };