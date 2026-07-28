const Order = require('../models/Order');
const Coupon = require('../models/Coupon');

/**
 * @desc    Áp dụng mã giảm giá động từ database vào hóa đơn
 * @route   POST /api/v1/orders/:id/apply-coupon
 * @access  Private (Staff/Admin)
 */
const applyCouponToOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const { coupon_code } = req.body;

    // 1. Tìm đơn hàng cần áp mã
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng yêu cầu.');
    }

    // 2. Tìm mã giảm giá trong cơ sở dữ liệu (chuyển chữ hoa để đối chiếu)
    const coupon = await Coupon.findOne({ code: coupon_code.toUpperCase() });
    
    if (!coupon || !coupon.is_active) {
      res.status(400);
      throw new Error('Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa.');
    }

    // 3. Kiểm tra hạn sử dụng của mã
    if (new Date() > coupon.expiry_date) {
      res.status(400);
      throw new Error('Mã giảm giá này hiện đã hết hạn sử dụng.');
    }

    // 4. Tính toán lại dòng tiền hóa đơn
    order.discount_amount = coupon.discount_value;
    order.final_total = Math.max(0, order.sub_total - coupon.discount_value);

    const updatedOrder = await order.save();

    res.status(200).json({
      success: true,
      message: `Áp dụng mã [${coupon.code}] thành công! Bạn được giảm ${coupon.discount_value.toLocaleString()}đ`,
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

const getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find();
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    next(error);
  }
};

const createCoupon = async (req, res, next) => {
  try {
    const newCoupon = await Coupon.create(req.body);
    res.status(201).json({ success: true, data: newCoupon });
  } catch (error) {
    next(error);
  }
};

const updateCoupon = async (req, res, next) => {
  try {
    const updated = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      res.status(404);
      throw new Error('Không tìm thấy mã giảm giá.');
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteCoupon = async (req, res, next) => {
  try {
    const deleted = await Coupon.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404);
      throw new Error('Không tìm thấy mã giảm giá.');
    }
    res.status(200).json({ success: true, message: 'Đã xóa mã giảm giá thành công.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { applyCouponToOrder, getCoupons, createCoupon, updateCoupon, deleteCoupon };