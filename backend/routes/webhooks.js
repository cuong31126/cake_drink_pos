const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Table = require('../models/Table');

/**
 * @desc    API xử lý tín hiệu Webhook tự động nhận biết tiền về từ PayOS (API số 28)
 * @route   POST /api/webhooks/payos
 * @access  Public (Cổng thanh toán gọi trực tiếp)
 */
router.post('/payos', async (req, res, next) => {
  try {
    const webhookData = req.body;

    // const verifiedData = payos.verifyWebhookData(webhookData)

    // 1. Kiểm tra tính hợp lệ của gói dữ liệu hoặc cờ trạng thái thành công
    // Lưu ý: Thực tế bạn có thể dùng thư viện payos.verifyWebhookData(webhookData) để kiểm tra chữ ký checksum bảo mật
    if (webhookData.success === true || (webhookData.data && webhookData.data.description)) {

      const description = webhookData.data.description;

      // 💡 HỌC TẬP: Sử dụng Regular Expression (Regex) để trích xuất 6 ký tự cuối của mã đơn hàng
      // Thích ứng với độ dài giới hạn của nội dung chuyển khoản ngân hàng (Ví dụ: "Thanh toan don 900da9")
      const match = description.match(/Thanh\s*toan\s*don\s*([a-f0-9]{6})/i);

      if (match) {
        const partialId = match[1].toLowerCase();

        // 2. Tìm kiếm đơn hàng tương ứng có ID kết thúc bằng partialId
        const order = await Order.findOne({
          _id: { $regex: new RegExp(partialId + '$', 'i') },
          status: 'serving'
        });
        if (order && order.status === 'serving') {

          // 3. Cập nhật hóa đơn thành Đã thanh toán và Hoàn thành
          order.payment_status = 'paid';
          order.status = 'completed';
          await order.save();

          // 4. Luồng đổi trạng thái bàn ăn (Luồng tự động về Trống như đã bàn)
          if (order.table_id) {
            await Table.findByIdAndUpdate(order.table_id, {
              status: 'available',      // Đổi sang màu xanh trống
              current_order_id: null    // Ngắt liên kết đơn hàng cũ
            });
          }

          console.log(`[Webhook PayOS] Đơn hàng ${order._id} đã được tự động chốt và giải phóng bàn thành công.`);
        }
      }
    }

    // Luôn luôn phản hồi trạng thái 200 về cho PayOS để họ biết hệ thống của bạn đã nhận được gói tin
    return res.status(200).json({ success: true, message: 'Nhận dữ liệu Webhook thành công' });
  } catch (error) {
    console.error(`[Webhook PayOS Lỗi]: ${error.message}`);
    // Trả về lỗi 500 tập trung thông qua tầng xử lý lỗi
    next(error);
  }
});

module.exports = router;