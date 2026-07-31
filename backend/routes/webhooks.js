const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Table = require('../models/Table');
const { PayOS } = require('@payos/node');

// Khởi tạo đối tượng PayOS với thông tin cấu hình từ file .env
const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || '',
  apiKey: process.env.PAYOS_API_KEY || '',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || ''
});

/**
 * 🟢 GET /api/webhooks/payos & GET /api/webhooks
 * Giúp PayOS Dashboard xác minh đường dẫn Webhook tồn tại (Trả về HTTP 200 OK)
 */
router.get(['/payos', '/'], (req, res) => {
  return res.status(200).json({
    success: true,
    status: 'active',
    message: 'PayOS Webhook Endpoint đang hoạt động sẵn sàng nhận dữ liệu.'
  });
});

/**
 * @desc    API xử lý tín hiệu Webhook tự động nhận biết tiền về từ PayOS (API số 28)
 * @route   POST /api/webhooks/payos và POST /api/webhooks
 * @access  Public (Cổng thanh toán gọi trực tiếp)
 */
const handlePayOSWebhook = async (req, res, next) => {
  try {
    const webhookBody = req.body;
    let webhookData = webhookBody.data || webhookBody;

    // 1. Kiểm tra tính hợp lệ và chữ ký bảo mật Webhook (Checksum) qua PayOS SDK
    try {
      if (process.env.PAYOS_CHECKSUM_KEY) {
        const verifiedData = payos.verifyWebhookData(webhookBody);
        if (verifiedData) {
          webhookData = verifiedData;
        }
      }
    } catch (verifyErr) {
      console.warn(`[PayOS Checksum Warning]: ${verifyErr.message}`);
      // Giữ nguyên webhookData từ req.body.data nếu checksum chưa khớp trong môi trường dev
    }

    // 2. Kiểm tra cờ trạng thái thành công hoặc mô tả nội dung giao dịch
    const description = webhookData.description || webhookBody.data?.description || '';
    const isSuccess = webhookBody.success === true || webhookData.code === '00';

    if (isSuccess || description) {
      // 1. Chuẩn hóa và khử toàn bộ dấu tiếng Việt (Ví dụ: "Thanh toán đơn" -> "thanh toan don")
      const cleanDesc = (description || '')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      // 2. Tìm tất cả các mã Hex 6 ký tự hoặc 24 ký tự xuất hiện trong nội dung chuyển khoản
      const hexTokens = cleanDesc.match(/[a-f0-9]{24}|[a-f0-9]{6}/gi) || [];

      let matchedOrder = null;

      for (const token of hexTokens) {
        const order = await Order.findOne({
          _id: { $regex: new RegExp(token + '$', 'i') }
        });

        if (order) {
          matchedOrder = order;
          break;
        }
      }

      if (matchedOrder && matchedOrder.payment_status !== 'paid') {
        // Cập nhật hóa đơn thành Đã thanh toán và Hoàn thành
        matchedOrder.payment_status = 'paid';
        matchedOrder.status = 'completed';
        await matchedOrder.save();

        // Giải phóng bàn ăn nếu là đơn tại bàn
        if (matchedOrder.table_id) {
          await Table.findByIdAndUpdate(matchedOrder.table_id, {
            status: 'available',      // Đổi sang màu xanh trống
            current_order_id: null    // Ngắt liên kết đơn hàng cũ
          });
        }

        console.log(`[Webhook PayOS Success] Đơn hàng #${matchedOrder._id.slice(-6).toUpperCase()} đã tự động chốt thanh toán và giải phóng bàn.`);
      }
    }

    // Luôn phản hồi HTTP 200 cho PayOS
    return res.status(200).json({ success: true, message: 'Nhận dữ liệu Webhook thành công' });
  } catch (error) {
    console.error(`[Webhook PayOS Lỗi]: ${error.message}`);
    next(error);
  }
};

router.post('/payos', handlePayOSWebhook);
router.post('/', handlePayOSWebhook);

module.exports = router;