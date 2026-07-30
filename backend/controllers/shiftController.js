const Shift = require('../models/Shift');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * @desc    🟢 Khởi tạo / Mở ca làm việc mới với số tiền thối két ban đầu
 * @route   POST /api/v1/shifts/open
 * @access  Private (Staff/Admin)
 */
const openShift = async (req, res, next) => {
  try {
    const { opening_cash, store_id } = req.body;
    const currentStoreId = store_id || req.user.store_id || 'store_Q1';
    const staffName = req.user.name || req.user.email || 'Nhân viên quầy';

    // 1. Kiểm tra xem đã có ca nào đang mở cho chi nhánh này hay chưa
    let activeShift = await Shift.findOne({
      store_id: currentStoreId,
      status: 'open'
    });

    if (activeShift) {
      return res.status(200).json({
        success: true,
        message: 'Ca làm việc hiện tại đã được mở từ trước.',
        data: activeShift
      });
    }

    // 2. Khởi tạo một ca mới theo đúng khuôn MongoDB của User
    activeShift = await Shift.create({
      store_id: currentStoreId,
      staff_id: req.user._id.toString(),
      staff_name: staffName,
      start_time: new Date(),
      end_time: null,
      opening_cash: Number(opening_cash) || 500000,
      system_cash_collected: 0,
      system_banking_collected: 0,
      closing_cash_actual: 0,
      difference: 0,
      total_bills_completed: 0,
      total_bills_cancelled: 0,
      status: 'open',
      note: 'Mở ca trực nhận két tiền thối.'
    });

    res.status(201).json({
      success: true,
      message: 'Đã mở ca làm việc thành công!',
      data: activeShift
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    🔴 Kết thúc ca làm việc, chốt tiền két và lưu tài liệu ca vào MongoDB Atlas
 * @route   POST /api/v1/shifts/close
 * @access  Private (Staff/Admin)
 */
const closeShift = async (req, res, next) => {
  try {
    const { closing_cash_actual, note, store_id } = req.body;
    const currentStoreId = store_id || req.user.store_id || 'store_Q1';
    const staffName = req.user.name || req.user.email || 'Nhân viên quầy';

    // 1. Tìm ca trực đang mở của chi nhánh
    let currentShift = await Shift.findOne({
      store_id: currentStoreId,
      status: 'open'
    });

    if (!currentShift) {
      res.status(404);
      throw new Error('Hiện không có ca làm việc nào đang mở để thực hiện kết ca.');
    }

    // 2. Thống kê tất cả các đơn hàng từ thời điểm start_time đến hiện tại
    const ordersInShift = await Order.find({
      store_id: currentStoreId,
      createdAt: { $gte: currentShift.start_time }
    });

    let cashCollected = 0;
    let bankingCollected = 0;
    let billsCompletedCount = 0;
    let billsCancelledCount = 0;

    ordersInShift.forEach(order => {
      if (order.status === 'completed' || order.payment_status === 'paid') {
        billsCompletedCount++;
        if (order.payment_method === 'payos' || order.payment_method === 'momo' || order.payment_method === 'bank') {
          bankingCollected += order.final_total || 0;
        } else {
          cashCollected += order.final_total || 0;
        }
      } else if (order.status === 'cancelled') {
        billsCancelledCount++;
      }
    });

    const actualCashNum = Number(closing_cash_actual) || 0;
    const expectedCashInDrawer = (currentShift.opening_cash || 0) + cashCollected;
    const cashDifference = actualCashNum - expectedCashInDrawer;

    // 3. Cập nhật và khóa sổ ca trực theo đúng chuẩn MongoDB Schema
    currentShift.staff_id = req.user._id.toString();
    currentShift.staff_name = staffName;
    currentShift.end_time = new Date();
    currentShift.system_cash_collected = cashCollected;
    currentShift.system_banking_collected = bankingCollected;
    currentShift.closing_cash_actual = actualCashNum;
    currentShift.difference = cashDifference;
    currentShift.total_bills_completed = billsCompletedCount;
    currentShift.total_bills_cancelled = billsCancelledCount;
    currentShift.status = 'closed';
    currentShift.note = note || 'Hủy 2 bill do nhân viên ca trước bấm nhầm số bàn. Tiền két khớp.';

    const closedShift = await currentShift.save();

    res.status(200).json({
      success: true,
      message: 'Chốt ca làm việc và bàn giao két tiền thành công!',
      data: closedShift
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    ⚡ Lấy thông tin ca trực hiện tại đang chạy
 * @route   GET /api/v1/shifts/current
 * @access  Private (Staff/Admin)
 */
const getCurrentShift = async (req, res, next) => {
  try {
    const storeId = req.query.store_id || req.user.store_id || 'store_Q1';
    let activeShift = await Shift.findOne({
      store_id: storeId,
      status: 'open'
    });

    if (!activeShift) {
      return res.status(200).json({
        success: true,
        active: false,
        data: null
      });
    }

    // Tính toán tức thời doanh thu trong ca từ start_time
    const ordersInShift = await Order.find({
      store_id: storeId,
      createdAt: { $gte: activeShift.start_time }
    });

    let cashCollected = 0;
    let bankingCollected = 0;
    let billsCompletedCount = 0;
    let billsCancelledCount = 0;

    ordersInShift.forEach(order => {
      if (order.status === 'completed' || order.payment_status === 'paid') {
        billsCompletedCount++;
        if (order.payment_method === 'payos' || order.payment_method === 'momo' || order.payment_method === 'bank') {
          bankingCollected += order.final_total || 0;
        } else {
          cashCollected += order.final_total || 0;
        }
      } else if (order.status === 'cancelled') {
        billsCancelledCount++;
      }
    });

    activeShift.system_cash_collected = cashCollected;
    activeShift.system_banking_collected = bankingCollected;
    activeShift.total_bills_completed = billsCompletedCount;
    activeShift.total_bills_cancelled = billsCancelledCount;

    res.status(200).json({
      success: true,
      active: true,
      data: activeShift
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    📜 Lấy danh sách lịch sử ca trực đã đóng (MongoDB Atlas)
 * @route   GET /api/v1/shifts/history
 * @access  Private (Staff/Admin)
 */
const getShiftHistory = async (req, res, next) => {
  try {
    const storeId = req.query.store_id || req.user.store_id;
    let query = { status: 'closed' };
    if (storeId) query.store_id = storeId;

    const history = await Shift.find(query).sort({ updatedAt: -1 }).limit(30);

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

const syncCash = async (req, res, next) => {
  return getCurrentShift(req, res, next);
};

/**
 * @desc    🔄 Bàn giao ca: Kết ca cũ + Mở ca mới ngay lập tức (Atomic Handover)
 * @route   POST /api/v1/shifts/handover
 * @access  Private (Staff/Admin)
 */
const handoverShift = async (req, res, next) => {
  try {
    const { closing_cash_actual, note, store_id } = req.body;
    const currentStoreId = store_id || req.user.store_id || 'store_Q1';
    const staffName = req.user.name || req.user.email || 'Nhân viên quầy';
    const now = new Date();

    // 1. Tìm ca đang mở
    let currentShift = await Shift.findOne({ store_id: currentStoreId, status: 'open' });
    if (!currentShift) {
      res.status(404);
      throw new Error('Không có ca đang mở tại chi nhánh này để bàn giao.');
    }

    // 2. Thống kê đơn hàng trong ca cũ
    const ordersInShift = await Order.find({
      store_id: currentStoreId,
      createdAt: { $gte: currentShift.start_time }
    });

    let cashCollected = 0, bankingCollected = 0, billsCompleted = 0, billsCancelled = 0;
    ordersInShift.forEach(order => {
      if (order.status === 'completed' || order.payment_status === 'paid') {
        billsCompleted++;
        if (['payos', 'momo', 'bank'].includes(order.payment_method)) {
          bankingCollected += order.final_total || 0;
        } else {
          cashCollected += order.final_total || 0;
        }
      } else if (order.status === 'cancelled') {
        billsCancelled++;
      }
    });

    const actualCashNum = Number(closing_cash_actual) || 0;
    const expectedCash = (currentShift.opening_cash || 0) + cashCollected;
    const cashDifference = actualCashNum - expectedCash;

    // 3. Đóng ca cũ với end_time = now
    currentShift.staff_id = req.user._id.toString();
    currentShift.staff_name = staffName;
    currentShift.end_time = now;
    currentShift.system_cash_collected = cashCollected;
    currentShift.system_banking_collected = bankingCollected;
    currentShift.closing_cash_actual = actualCashNum;
    currentShift.difference = cashDifference;
    currentShift.total_bills_completed = billsCompleted;
    currentShift.total_bills_cancelled = billsCancelled;
    currentShift.status = 'closed';
    currentShift.note = note || 'Bàn giao ca tự động.';
    const closedShift = await currentShift.save();

    // 4. Mở ca mới ngay lập tức với start_time = now (bằng end_time ca cũ)
    //    Tiền đầu ca mới = tiền bàn giao thực tế từ ca cũ
    const newShift = await Shift.create({
      store_id: currentStoreId,
      staff_id: req.user._id.toString(),
      staff_name: staffName,
      start_time: now,
      end_time: null,
      opening_cash: actualCashNum,
      system_cash_collected: 0,
      system_banking_collected: 0,
      closing_cash_actual: 0,
      difference: 0,
      total_bills_completed: 0,
      total_bills_cancelled: 0,
      status: 'open',
      note: `Ca mới bàn giao từ ca #${closedShift._id.toString().slice(-6).toUpperCase()}`
    });

    res.status(200).json({
      success: true,
      message: 'Bàn giao ca thành công! Ca mới đã được mở ngay lập tức.',
      data: {
        closedShift,
        newShift
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { openShift, closeShift, handoverShift, getCurrentShift, getShiftHistory, syncCash };