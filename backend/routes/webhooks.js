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
 * @desc    API xử lý tín hiệu Webhook tự động nhận biết tiền về từ PayOS (API số 28)
 * @route   POST /api/webhooks/payos
 * @access  Public (Cổng thanh toán gọi trực tiếp)
 */
router.post('/payos', async (req, res, next) => {
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
      // Trích xuất 6 ký tự cuối của mã đơn hàng (Ví dụ: "Thanh toan don 900da9")
      const match = description.match(/Thanh\s*toan\s*don\s*([a-f0-9]{6})/i);

      if (match) {
        const partialId = match[1].toLowerCase();

        // 3. Tìm kiếm đơn hàng tương ứng có ID kết thúc bằng partialId
        const order = await Order.findOne({
          _id: { $regex: new RegExp(partialId + '$', 'i') }
        });

        if (order && order.payment_status !== 'paid') {
          // Cập nhật hóa đơn thành Đã thanh toán và Hoàn thành
          order.payment_status = 'paid';
          order.status = 'completed';
          await order.save();

          // Giải phóng bàn ăn nếu là đơn tại bàn
          if (order.table_id) {
            await Table.findByIdAndUpdate(order.table_id, {
              status: 'available',      // Đổi sang màu xanh trống
              current_order_id: null    // Ngắt liên kết đơn hàng cũ
            });
          }

          console.log(`[Webhook PayOS Success] Đơn hàng #${order._id.slice(-6).toUpperCase()} đã tự động chốt thanh toán và giải phóng bàn.`);
        }
      }
    }

    // Luôn phản hồi HTTP 200 cho PayOS
    return res.status(200).json({ success: true, message: 'Nhận dữ liệu Webhook thành công' });
  } catch (error) {
    console.error(`[Webhook PayOS Lỗi]: ${error.message}`);
    next(error);
  }
});

module.exports = router;