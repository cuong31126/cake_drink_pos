const Shift = require('../models/Shift');
const Order = require('../models/Order');

/**
 * @desc    Nhân viên part-time bắt đầu vào ca trực, khai báo số tiền thối đầu két sắt
 * @route   POST /api/v1/shifts/open
 * @access  Private (Staff/Admin)
 */
const openShift = async (req, res, next) => {
  try {
    const { opening_cash, store_id } = req.body;

    // 1. Kiểm tra xem nhân viên này hiện tại đã có ca làm việc nào đang mở (chưa đóng) hay chưa
    const activeShift = await Shift.findOne({
      staff_id: req.user._id.toString(),
      status: 'open'
    });

    if (activeShift) {
      res.status(400);
      throw new Error('Bạn hiện đang có một ca làm việc đang mở trên hệ thống. Vui lòng chốt ca cũ trước khi mở ca mới.');
    }

    // 2. Khởi tạo một phiên ca trực mới
    const newShift = await Shift.create({
      store_id,
      staff_id: req.user._id.toString(),
      start_time: new Date(),
      end_time: null,
      opening_cash: opening_cash || 0,
      system_cash_collected: 0,
      system_banking_collected: 0,
      closing_cash_actual: 0,
      difference: 0,
      total_bills_completed: 0,
      total_bills_cancelled: 0,
      status: 'open',
      note: 'Nhận ca trực mở két tiền thối.'
    });

    res.status(201).json({
      success: true,
      message: 'Mở ca trực và ghi nhận số dư két tiền đầu ca thành công.',
      data: newShift
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Kết thúc ca làm việc, nhân viên đếm tiền mặt thực tế, hệ thống chạy hàm tính toán đối soát lệch tiền
 * @route   POST /api/v1/shifts/close
 * @access  Private (Staff/Admin)
 */
const closeShift = async (req, res, next) => {
  try {
    const { closing_cash_actual, note } = req.body;

    // 1. Tìm ca trực đang chạy của nhân viên thực hiện yêu cầu
    const currentShift = await Shift.findOne({
      staff_id: req.user._id.toString(),
      status: 'open'
    });

    if (!currentShift) {
      res.status(404);
      throw new Error('Không tìm thấy phiên ca trực nào đang mở của bạn trên hệ thống.');
    }

    // 2. Gom nhóm tính toán toàn bộ hóa đơn phát sinh trong khoảng thời gian ca trực này chạy
    // Tìm các đơn hàng thuộc chi nhánh này, do nhân viên này lập từ lúc start_time đến hiện tại
    const ordersInShift = await Order.find({
      store_id: currentShift.store_id,
      created_by: currentShift.staff_id,
      createdAt: { $gte: currentShift.start_time }
    });

    let cashCollected = 0;
    let bankingCollected = 0;
    let billsCompletedCount = 0;
    let billsCancelledCount = 0;

    ordersInShift.forEach(order => {
      if (order.status === 'completed') {
        billsCompletedCount++;
        // Tách dòng tiền dựa trên phương thức thanh toán thực tế của đơn hàng
        // Giả định đơn dine-in thu tiền mặt tại quầy, đơn delivery quét QR ngân hàng qua cổng PayOS
        if (order.order_type === 'dine-in' || order.order_type === 'take-away') {
          cashCollected += order.final_total;
        } else {
          bankingCollected += order.final_total;
        }
      } else if (order.status === 'cancelled') {
        billsCancelledCount++; // Thống kê bill bấm nhầm/hủy để admin kiểm tra chéo
      }
    });

    // 3. Tính toán công thức chênh lệch dòng tiền mặt thực tế trong két
    // Tiền lý thuyết phải có trong két = Tiền mặt đầu ca để lại + Tổng tiền mặt thu được từ khách ăn tại quán
    const expectedCashInDrawer = currentShift.opening_cash + cashCollected;
    const cashDifference = closing_cash_actual - expectedCashInDrawer;

    // 4. Lưu toàn bộ kết quả tổng hợp chốt số liệu vào tài liệu ca trực để khóa sổ
    currentShift.end_time = new Date();
    currentShift.system_cash_collected = cashCollected;
    currentShift.system_banking_collected = bankingCollected;
    currentShift.closing_cash_actual = closing_cash_actual;
    currentShift.difference = cashDifference; // Số âm = hụt tiền mặt, số dương = thừa tiền mặt mặt, 0 = khớp hoàn hảo
    currentShift.total_bills_completed = billsCompletedCount;
    currentShift.total_bills_cancelled = billsCancelledCount;
    currentShift.status = 'closed'; // Khóa trạng thái ca
    currentShift.note = note || 'Chốt ca trực bàn giao sổ sách két tiền.';

    const closedShift = await currentShift.save();

    res.status(200).json({
      success: true,
      message: 'Chốt ca trực và đồng bộ báo cáo kết ca tài chính thành công.',
      data: closedShift
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentShift = async (req, res, next) => {
  try {
    const activeShift = await Shift.findOne({
      staff_id: req.user._id.toString(),
      status: 'open'
    });
    if (!activeShift) {
      return res.status(200).json({ success: true, active: false, data: null });
    }
    res.status(200).json({ success: true, active: true, data: activeShift });
  } catch (error) {
    next(error);
  }
};

const syncCash = async (req, res, next) => {
  try {
    const activeShift = await Shift.findOne({
      staff_id: req.user._id.toString(),
      status: 'open'
    });
    if (!activeShift) {
      res.status(404);
      throw new Error('Bạn không có ca trực nào đang mở.');
    }

    const ordersInShift = await Order.find({
      store_id: activeShift.store_id,
      created_by: activeShift.staff_id,
      createdAt: { $gte: activeShift.start_time }
    });

    let cashCollected = 0;
    let bankingCollected = 0;
    ordersInShift.forEach(order => {
      if (order.status === 'completed') {
        if (order.order_type === 'dine-in' || order.order_type === 'take-away') {
          cashCollected += order.final_total;
        } else {
          bankingCollected += order.final_total;
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        opening_cash: activeShift.opening_cash,
        system_cash_collected: cashCollected,
        system_banking_collected: bankingCollected,
        expected_total_cash: activeShift.opening_cash + cashCollected
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { openShift, closeShift, getCurrentShift, syncCash };