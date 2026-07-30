const Notification = require('../models/Notification');

/**
 * @desc    Lấy danh sách thông báo của người dùng hiện tại
 * @route   GET /api/v1/notifications
 * @access  Private (User/Staff/Admin)
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const userName = req.user.name || '';
    const userEmail = req.user.email || '';

    const notifications = await Notification.find({
      $or: [
        { user_id: userId },
        { user_id: userName },
        { user_id: userEmail },
        { user_id: 'all_users' }
      ]
    }).sort({ createdAt: -1 }).limit(30);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    res.status(200).json({
      success: true,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đánh dấu 1 thông báo là đã đọc
 * @route   PATCH /api/v1/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { is_read: true },
      { new: true }
    );
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đánh dấu tất cả thông báo là đã đọc
 * @route   PATCH /api/v1/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    await Notification.updateMany(
      { $or: [{ user_id: userId }, { user_id: 'all_users' }] },
      { is_read: true }
    );
    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo là đã đọc.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo thông báo mới (Admin phát thông báo khuyến mãi / hệ thống)
 * @route   POST /api/v1/notifications
 * @access  Private (Admin)
 */
const createNotification = async (req, res, next) => {
  try {
    const { user_id, title, message, type, order_id } = req.body;

    const notification = await Notification.create({
      user_id: user_id || 'all_users',
      title,
      message,
      type: type || 'promotion',
      order_id: order_id || null
    });

    res.status(201).json({
      success: true,
      message: 'Đã gửi thông báo thành công.',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  createNotification
};
